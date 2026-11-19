"""Model provider abstraction: local Ollama, any OpenAI-compatible endpoint, or none."""
from __future__ import annotations
import json
import os
import re
from typing import Protocol

import httpx


class ProviderError(RuntimeError):
    pass


class Provider(Protocol):
    name: str
    model: str

    def complete(self, system: str, user: str, json_mode: bool = True) -> str: ...
    def ready(self) -> bool: ...


class NullProvider:
    """No model configured. Always fails so the graph routes to its fallback."""
    name = "none"
    model = "none"

    def complete(self, system: str, user: str, json_mode: bool = True) -> str:
        raise ProviderError("no model provider configured")

    def ready(self) -> bool:
        return False


class OllamaProvider:
    name = "ollama"

    def __init__(self, base_url: str, model: str, timeout: float = 20.0):
        from langchain_ollama import ChatOllama  # LangChain integration
        self.base_url, self.model, self.timeout = base_url.rstrip("/"), model, timeout
        self._llm = ChatOllama(base_url=self.base_url, model=model, temperature=0.2, format="json", client_kwargs={"timeout": timeout})
        self._llm_text = ChatOllama(base_url=self.base_url, model=model, temperature=0.5, client_kwargs={"timeout": timeout})

    def complete(self, system: str, user: str, json_mode: bool = True) -> str:
        from langchain_core.messages import SystemMessage, HumanMessage
        try:
            llm = self._llm if json_mode else self._llm_text
            return str(llm.invoke([SystemMessage(system), HumanMessage(user)]).content)
        except Exception as e:  # network, timeout, model missing
            raise ProviderError(str(e)) from e

    def ready(self) -> bool:
        try:
            r = httpx.get(f"{self.base_url}/api/tags", timeout=2)
            return r.status_code == 200 and any(m.get("name", "").startswith(self.model.split(":")[0]) for m in r.json().get("models", []))
        except Exception:
            return False


class OpenAICompatibleProvider:
    name = "openai-compatible"

    def __init__(self, base_url: str, model: str, api_key: str, timeout: float = 20.0):
        self.base_url, self.model, self._key, self.timeout = base_url.rstrip("/"), model, api_key, timeout

    def complete(self, system: str, user: str, json_mode: bool = True) -> str:
        body: dict = {"model": self.model, "temperature": 0.2, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        try:
            r = httpx.post(f"{self.base_url}/chat/completions", json=body, headers={"Authorization": f"Bearer {self._key}"}, timeout=self.timeout)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            raise ProviderError(str(e)) from e

    def ready(self) -> bool:
        return bool(self._key)


def provider_from_env() -> Provider:
    kind = os.getenv("MODEL_PROVIDER", "ollama").lower()
    timeout = float(os.getenv("MODEL_TIMEOUT_SECONDS", "20"))
    if kind == "ollama":
        return OllamaProvider(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"), os.getenv("OLLAMA_MODEL", "llama3.1:8b"), timeout)
    if kind == "openai":
        key = os.getenv("OPENAI_API_KEY", "")
        if not key:
            return NullProvider()
        return OpenAICompatibleProvider(os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"), os.getenv("OPENAI_MODEL", "gpt-4o-mini"), key, timeout)
    return NullProvider()


def parse_json(text: str) -> dict:
    """Extract the first JSON object from model output (handles ```json fences)."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON object in model output")
    return json.loads(m.group(0))
