"""English Learning Orchestrator (LangGraph).

One graph handles every non-chat request. `route` picks exactly ONE specialist per request
(never every agent). Specialist output is validated with Pydantic; invalid output is retried
once, then the graph falls back to a degraded result that tells the API to use its
deterministic evaluator.
"""
from __future__ import annotations

import json
import logging
import operator
import time
from typing import Annotated, Any, Literal, Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from pydantic import ValidationError

from .models import Evaluation, GeneratedLesson, Learner, Recommendation
from .prompts import CHAT_INSTRUCTIONS, EVALUATION_FORMAT, LESSON_FORMAT, SKILL_INSTRUCTIONS, TEACHER_SYSTEM_PROMPT, tamil_note
from .providers import Provider, ProviderError, parse_json

log = logging.getLogger("fluentpath.agent")
MAX_ATTEMPTS = 2

Intent = Literal["evaluate", "next_activity", "generate", "pronunciation"]
SPECIALISTS = ["reading", "writing", "speaking", "grammar", "vocabulary", "pronunciation", "technical", "assessment", "progress"]


class TutorState(TypedDict, total=False):
    intent: Intent
    skill: str
    learner: dict
    task: dict
    answer: str
    payload: dict
    agent: str          # which specialist ran
    raw: Optional[str]  # raw model output
    result: Optional[dict]
    errors: list[str]
    attempts: int


# ---------------- routing ----------------
def route(state: TutorState) -> str:
    intent = state.get("intent", "evaluate")
    if intent == "next_activity":
        return "progress"
    if intent == "generate":
        return "grammar"
    if intent == "pronunciation":
        return "pronunciation"
    skill = state.get("skill", "writing")
    return skill if skill in SPECIALISTS else "writing"


def load_context(state: TutorState) -> TutorState:
    learner = Learner(**(state.get("learner") or {})).model_dump()
    return {"learner": learner, "errors": state.get("errors", []), "attempts": state.get("attempts", 0)}


# ---------------- specialists ----------------
def build_graph(provider: Provider, checkpointer=None):
    def _call(state: TutorState, system: str, user: str, json_mode: bool = True) -> TutorState:
        attempts = state.get("attempts", 0) + 1
        started = time.time()
        try:
            raw = provider.complete(system, user, json_mode=json_mode)
            log.info(json.dumps({"agent": state.get("agent"), "ms": int((time.time() - started) * 1000), "attempt": attempts}))
            return {"raw": raw, "attempts": attempts}
        except ProviderError as e:
            return {"raw": None, "attempts": MAX_ATTEMPTS, "errors": [*state.get("errors", []), f"provider: {e}"]}

    def evaluator_node(name: str):
        def node(state: TutorState) -> TutorState:
            learner, task = state["learner"], state.get("task", {})
            system = f"{TEACHER_SYSTEM_PROMPT}\n\nRole: {name.title()} Agent. {SKILL_INSTRUCTIONS[name]}\n{tamil_note(learner['tamil_support'], learner['level'])}\n{EVALUATION_FORMAT}"
            user = json.dumps({
                "learner_level": learner["level"], "weak_areas": learner["weak_areas"],
                "question": task.get("prompt"), "expected_keywords": task.get("keywords", []),
                "min_sentences": task.get("min_sentences", 1), "example_good_answer": task.get("sample"),
                "learner_answer": state.get("answer", ""),
            }, ensure_ascii=False)
            return {**_call({**state, "agent": name}, system, user), "agent": name}
        return node

    def grammar_node(state: TutorState) -> TutorState:
        if state.get("intent") != "generate":
            return evaluator_node("grammar")(state)
        p = state.get("payload", {})
        system = f"{TEACHER_SYSTEM_PROMPT}\n\nRole: Grammar Agent. Write a complete beginner-friendly lesson.\n{LESSON_FORMAT}"
        user = json.dumps({"topic": p.get("topic"), "stage": p.get("stage"), "learner_level": p.get("level")})
        return {**_call({**state, "agent": "grammar"}, system, user), "agent": "grammar"}

    def pronunciation_node(state: TutorState) -> TutorState:
        # Guidance only. Audio assessment requires a speech service; this node never scores.
        target = (state.get("payload") or {}).get("target", "")
        system = f"{TEACHER_SYSTEM_PROMPT}\n\nRole: Pronunciation Agent. {SKILL_INSTRUCTIONS['pronunciation']}\nReturn JSON: {{\"syllables\": [..], \"stress\": \"..\", \"tips\": [..]}}"
        return {**_call({**state, "agent": "pronunciation"}, system, json.dumps({"target": target})), "agent": "pronunciation"}

    def progress_node(state: TutorState) -> TutorState:
        return {"agent": "progress", "result": recommend(state.get("payload") or {}).model_dump(), "attempts": 1}

    def validate(state: TutorState) -> TutorState:
        if state.get("result") is not None:
            return {}
        raw = state.get("raw")
        if raw is None:
            return {"result": None}
        try:
            data = parse_json(raw)
            if state.get("intent") == "generate":
                return {"result": GeneratedLesson(**data).model_dump()}
            if state.get("intent") == "pronunciation":
                if not isinstance(data.get("tips"), list):
                    raise ValueError("tips missing")
                return {"result": {**data, "audio_assessed": False, "score": None}}
            ev = Evaluation(**{**data, "evaluator": "llm"})
            if not state.get("answer", "").strip() and ev.score > 0:
                raise ValueError("non-zero score for an empty answer")
            if ev.score < 90 and not ev.corrections and not ev.feedback.strip():
                raise ValueError("low score without feedback")
            return {"result": ev.model_dump()}
        except (ValueError, ValidationError, json.JSONDecodeError) as e:
            return {"result": None, "errors": [*state.get("errors", []), f"invalid output: {str(e)[:200]}"]}

    def after_validate(state: TutorState) -> str:
        if state.get("result") is not None:
            return "done"
        if state.get("attempts", 0) < MAX_ATTEMPTS:
            return "retry"
        return "fallback"

    def fallback(state: TutorState) -> TutorState:
        log.warning(json.dumps({"agent": state.get("agent"), "fallback": True, "errors": state.get("errors", [])[-2:]}))
        if state.get("intent") == "evaluate":
            return {"result": {"score": 0, "corrections": [], "natural_version": "", "feedback": "", "evaluator": "unavailable"}}
        return {"result": None}

    g = StateGraph(TutorState)
    g.add_node("load_context", load_context)
    for name in ["reading", "writing", "speaking", "vocabulary", "technical", "assessment"]:
        g.add_node(name, evaluator_node(name))
    g.add_node("grammar", grammar_node)
    g.add_node("pronunciation", pronunciation_node)
    g.add_node("progress", progress_node)
    g.add_node("validate", validate)
    g.add_node("fallback", fallback)
    g.add_edge(START, "load_context")
    g.add_conditional_edges("load_context", route, {n: n for n in SPECIALISTS})
    for n in SPECIALISTS:
        g.add_edge(n, "validate")
    g.add_conditional_edges("validate", after_validate, {"done": END, "fallback": "fallback", "retry": "retry_router"})
    g.add_node("retry_router", lambda s: {})
    g.add_conditional_edges("retry_router", route, {n: n for n in SPECIALISTS})
    g.add_edge("fallback", END)
    return g.compile(checkpointer=checkpointer)


# ---------------- Progress & Revision agent (deterministic) ----------------
def recommend(p: dict) -> Recommendation:
    pending: list[str] = p.get("pending_activities") or []
    due = int(p.get("revision_due") or 0)
    skills: dict[str, Optional[float]] = p.get("skill_averages") or {}
    exams: dict[str, Optional[float]] = p.get("recent_exam_percents") or {}
    weakest = min(((k, v) for k, v in skills.items() if v is not None), key=lambda kv: kv[1], default=None)
    ready_for_exam = bool(skills) and all(v is not None and v >= 75 for v in skills.values())
    ready_for_promotion = all(exams.get(t) is not None and exams[t] >= 75 for t in ("read", "write", "speak", "lesson"))
    if due >= 5:
        return Recommendation(next_kind="revision", reason=f"{due} revision items are due — review them before new content.", ready_for_exam=ready_for_exam, ready_for_promotion=ready_for_promotion)
    if pending:
        return Recommendation(next_kind=pending[0], reason="Continue today's plan.", ready_for_exam=ready_for_exam, ready_for_promotion=ready_for_promotion)
    if weakest and weakest[1] < 75:
        return Recommendation(next_kind=weakest[0], reason=f"Your {weakest[0]} average is {weakest[1]:.0f}% — practise it to reach 75%.", ready_for_exam=ready_for_exam, ready_for_promotion=ready_for_promotion)
    if ready_for_exam and not ready_for_promotion:
        missing = [t for t in ("read", "write", "speak", "lesson") if (exams.get(t) or 0) < 75]
        return Recommendation(next_kind=f"exam:{missing[0]}", reason="Your practice scores are above 75%. Take the next module exam.", ready_for_exam=True, ready_for_promotion=False)
    return Recommendation(next_kind="revision" if due else "speaking", reason="Keep practising daily.", ready_for_exam=ready_for_exam, ready_for_promotion=ready_for_promotion)


# ---------------- Conversation graph (checkpointed per thread) ----------------
class ChatState(TypedDict, total=False):
    messages: Annotated[list[dict], operator.add]  # appended across turns via the checkpointer
    agent: str
    learner: dict
    reply: Optional[str]


def build_chat_graph(provider: Provider, checkpointer=None):
    def respond(state: ChatState) -> ChatState:
        learner = Learner(**(state.get("learner") or {}))
        history = state.get("messages", [])[-12:]
        system = f"{TEACHER_SYSTEM_PROMPT}\n\n{CHAT_INSTRUCTIONS.get(state.get('agent', 'tutor'), CHAT_INSTRUCTIONS['tutor'])}\nLearner level: {learner.level}/8. {tamil_note(learner.tamil_support, learner.level)}"
        transcript = "\n".join(f"{m['role']}: {m['text']}" for m in history)
        try:
            reply = provider.complete(system, transcript + "\ntutor:", json_mode=False).strip()
        except ProviderError:
            return {"reply": None}
        return {"reply": reply, "messages": [{"role": "tutor", "text": reply}]}

    g = StateGraph(ChatState)
    g.add_node("respond", respond)
    g.add_edge(START, "respond")
    g.add_edge("respond", END)
    return g.compile(checkpointer=checkpointer or MemorySaver())


def run(graph, state: dict[str, Any]) -> dict:
    return graph.invoke(state)
