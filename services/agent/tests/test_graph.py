import json

import pytest
from fastapi.testclient import TestClient

from app.graph import build_graph, recommend, route
from app.main import create_app
from app.providers import NullProvider, ProviderError

GOOD = json.dumps({
    "score": 72, "corrections": [{"original": "He are my friend.", "corrected": "He is my friend.", "explanation": "He takes is.", "category": "be-verb"}],
    "natural_version": "He is my friend.", "professional_version": None, "feedback": "Good try!", "repeat_practice": "He is my friend.",
    "criteria": {"grammar": 70, "vocabulary": 80, "clarity": 75, "completeness": 70},
})


class FakeProvider:
    name, model = "fake", "fake-1"

    def __init__(self, outputs):
        self.outputs, self.calls, self.users = list(outputs), [], []

    def complete(self, system, user, json_mode=True):
        self.calls.append(system)
        self.users.append(user)
        out = self.outputs.pop(0)
        if isinstance(out, Exception):
            raise out
        return out

    def ready(self):
        return True


def evaluate(provider, skill="writing", answer="He are my friend."):
    g = build_graph(provider)
    return g.invoke({"intent": "evaluate", "skill": skill, "learner": {"level": 1}, "task": {"prompt": "Describe a friend"}, "answer": answer})


@pytest.mark.parametrize("state,expected", [
    ({"intent": "evaluate", "skill": "speaking"}, "speaking"),
    ({"intent": "evaluate", "skill": "technical"}, "technical"),
    ({"intent": "evaluate", "skill": "unknown"}, "writing"),
    ({"intent": "next_activity"}, "progress"),
    ({"intent": "generate"}, "grammar"),
    ({"intent": "pronunciation"}, "pronunciation"),
])
def test_route_picks_exactly_one_specialist(state, expected):
    assert route(state) == expected


def test_specialist_output_is_validated_and_returned():
    p = FakeProvider([GOOD])
    out = evaluate(p, skill="speaking")
    assert out["agent"] == "speaking"
    assert out["result"]["evaluator"] == "llm"
    assert out["result"]["corrections"][0]["corrected"] == "He is my friend."
    assert len(p.calls) == 1 and "Speaking Agent" in p.calls[0]


def test_invalid_output_is_retried_once_then_succeeds():
    p = FakeProvider(["not json", GOOD])
    out = evaluate(p)
    assert out["result"]["score"] == 72
    assert len(p.calls) == 2


def test_out_of_range_score_falls_back_after_retry():
    bad = json.dumps({**json.loads(GOOD), "score": 140})
    out = evaluate(FakeProvider([bad, bad]))
    assert out["result"]["evaluator"] == "unavailable"


def test_provider_error_falls_back_without_retry():
    p = FakeProvider([ProviderError("timeout")])
    out = evaluate(p)
    assert out["result"]["evaluator"] == "unavailable"
    assert len(p.calls) == 1


def test_empty_answer_with_positive_score_is_rejected():
    out = evaluate(FakeProvider([GOOD, GOOD]), answer="  ")
    assert out["result"]["evaluator"] == "unavailable"


def test_progress_agent_prioritises_revision_then_plan_then_weak_skill():
    assert recommend({"revision_due": 6, "pending_activities": ["reading"]}).next_kind == "revision"
    assert recommend({"pending_activities": ["reading"]}).next_kind == "reading"
    r = recommend({"skill_averages": {"read": 90, "write": 60}})
    assert r.next_kind == "write" and not r.ready_for_exam
    r = recommend({"skill_averages": {"read": 90, "write": 80}, "recent_exam_percents": {"read": 80}})
    assert r.ready_for_exam and r.next_kind.startswith("exam:") and not r.ready_for_promotion


def test_api_without_model_degrades_gracefully():
    c = TestClient(create_app(NullProvider()))
    assert c.get("/health").json()["model_ready"] is False
    r = c.post("/v1/evaluate", json={"skill": "writing", "task": {"prompt": "x"}, "answer": "I is happy"})
    assert r.status_code == 200 and r.json()["evaluator"] == "unavailable"
    assert c.post("/v1/chat", json={"thread_id": "t1", "message": "hi"}).json()["evaluator"] == "unavailable"
    assert c.post("/v1/generate", json={"kind": "lesson", "topic": "Was, Were"}).status_code == 503
    assert c.post("/v1/next-activity", json={"revision_due": 9}).json()["next_kind"] == "revision"


def test_chat_keeps_thread_memory():
    p = FakeProvider(["Hello! What is your name?", "Nice to meet you, Ann."])
    c = TestClient(create_app(p))
    assert c.post("/v1/chat", json={"thread_id": "t1", "message": "hello"}).json()["reply"].startswith("Hello")
    c.post("/v1/chat", json={"thread_id": "t1", "message": "My name is Ann"})
    # the second turn's transcript includes earlier turns restored from the checkpointed thread
    assert "learner: hello" in p.users[1]
    assert "tutor: Hello! What is your name?" in p.users[1]
    assert "learner: My name is Ann" in p.users[1]
    # a different thread starts fresh
    p.outputs.append("Hi!")
    c.post("/v1/chat", json={"thread_id": "t2", "message": "hey"})
    assert "learner: hello" not in p.users[2]


def test_service_token_is_enforced(monkeypatch):
    monkeypatch.setenv("AGENT_SERVICE_TOKEN", "s3cret")
    c = TestClient(create_app(NullProvider()))
    assert c.post("/v1/next-activity", json={}).status_code == 401
    assert c.post("/v1/next-activity", json={}, headers={"Authorization": "Bearer s3cret"}).status_code == 200


def test_groq_provider_from_env(monkeypatch):
    from app.providers import provider_from_env, OpenAICompatibleProvider, NullProvider
    monkeypatch.setenv("MODEL_PROVIDER", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert isinstance(provider_from_env(), NullProvider)
    monkeypatch.setenv("GROQ_API_KEY", "x")
    p = provider_from_env()
    assert isinstance(p, OpenAICompatibleProvider) and p.base_url == "https://api.groq.com/openai/v1" and p.ready()


def test_deployed_agent_without_token_refuses_requests(monkeypatch):
    monkeypatch.delenv("AGENT_SERVICE_TOKEN", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    c = TestClient(create_app(NullProvider()))
    assert c.post("/v1/next-activity", json={}).status_code == 503
    h = c.get("/health").json()
    assert h["config"]["service_token_set"] is False and "GROQ" not in str(h).upper().replace("GROQ_KEY_SET", "")
