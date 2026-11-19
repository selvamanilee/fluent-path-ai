"""FluentPath AI agent service (internal). Called only by the API, authenticated with a shared token."""
from __future__ import annotations

import hmac
import logging
import os

from fastapi import Depends, FastAPI, Header, HTTPException
from langgraph.checkpoint.memory import MemorySaver

from .graph import build_chat_graph, build_graph, recommend, run
from .models import ChatRequest, ChatResponse, EvaluateRequest, GenerateRequest, NextActivityRequest, Recommendation
from .providers import Provider, provider_from_env

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format='{"level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}')


def create_app(provider: Provider | None = None) -> FastAPI:
    provider = provider or provider_from_env()
    graph = build_graph(provider)
    chat_graph = build_chat_graph(provider, MemorySaver())  # swap for a Postgres checkpointer in production
    token = os.getenv("AGENT_SERVICE_TOKEN", "")
    app = FastAPI(title="FluentPath AI Agent", version="0.1.0")

    def auth(authorization: str = Header(default="")):
        if not token:
            return  # local development without a token
        if not hmac.compare_digest(authorization, f"Bearer {token}"):
            raise HTTPException(status_code=401, detail="unauthorized")

    @app.get("/health")
    def health():
        return {"ok": True, "provider": provider.name, "model": provider.model, "model_ready": provider.ready()}

    @app.post("/v1/evaluate", dependencies=[Depends(auth)])
    def evaluate(req: EvaluateRequest):
        out = run(graph, {"intent": "evaluate", "skill": req.skill, "learner": req.learner.model_dump(), "task": req.task.model_dump(), "answer": req.answer})
        return {**out["result"], "agent": out.get("agent")}

    @app.post("/v1/next-activity", dependencies=[Depends(auth)], response_model=Recommendation)
    def next_activity(req: NextActivityRequest):
        out = run(graph, {"intent": "next_activity", "learner": req.learner.model_dump(), "payload": req.model_dump()})
        return out["result"]

    @app.post("/v1/generate", dependencies=[Depends(auth)])
    def generate(req: GenerateRequest):
        out = run(graph, {"intent": "generate", "payload": req.model_dump()})
        if not out.get("result"):
            raise HTTPException(status_code=503, detail="content generation unavailable")
        return {**out["result"], "model": provider.model}

    @app.post("/v1/pronunciation", dependencies=[Depends(auth)])
    def pronunciation(payload: dict):
        out = run(graph, {"intent": "pronunciation", "payload": {"target": str(payload.get("target", ""))[:200]}})
        if not out.get("result"):
            raise HTTPException(status_code=503, detail="pronunciation guidance unavailable")
        return out["result"]

    @app.post("/v1/chat", dependencies=[Depends(auth)], response_model=ChatResponse)
    def chat(req: ChatRequest):
        cfg = {"configurable": {"thread_id": req.thread_id}}
        out = chat_graph.invoke({"messages": [{"role": "learner", "text": req.message}], "agent": req.agent, "learner": req.learner.model_dump()}, cfg)
        if not out.get("reply"):
            return ChatResponse(reply="", evaluator="unavailable")
        return ChatResponse(reply=out["reply"], evaluator="llm")

    return app


app = create_app()
