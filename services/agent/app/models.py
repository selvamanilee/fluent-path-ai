from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

Skill = Literal["reading", "writing", "speaking", "grammar", "vocabulary", "pronunciation", "technical", "assessment"]


class Learner(BaseModel):
    level: int = Field(1, ge=1, le=8)
    tamil_support: Literal["always", "when_needed", "off"] = "when_needed"
    weak_areas: list[str] = Field(default_factory=list, max_length=10)


class Task(BaseModel):
    prompt: str = Field(..., max_length=2000)
    keywords: list[str] = Field(default_factory=list, max_length=20)
    min_sentences: int = Field(1, ge=1, le=20)
    sample: Optional[str] = Field(None, max_length=2000)


class EvaluateRequest(BaseModel):
    skill: Skill
    task: Task
    answer: str = Field(..., max_length=5000)
    learner: Learner = Field(default_factory=Learner)


class Correction(BaseModel):
    original: str
    corrected: str
    explanation: str
    explanation_ta: Optional[str] = None
    category: str = "grammar"


class Evaluation(BaseModel):
    score: float = Field(..., ge=0, le=100)
    corrections: list[Correction] = Field(default_factory=list, max_length=30)
    natural_version: str
    professional_version: Optional[str] = None
    feedback: str
    repeat_practice: Optional[str] = None
    criteria: Optional[dict[str, float]] = None
    evaluator: Literal["llm", "unavailable"] = "llm"

    @field_validator("criteria")
    @classmethod
    def _bounded(cls, v):
        if v:
            for k, x in v.items():
                if not 0 <= x <= 100:
                    raise ValueError(f"criteria {k} out of range")
        return v


class ChatRequest(BaseModel):
    agent: Literal["speaking", "writing", "tutor"] = "tutor"
    thread_id: str = Field(..., max_length=64)
    message: str = Field(..., max_length=2000)
    learner: Learner = Field(default_factory=Learner)


class ChatResponse(BaseModel):
    reply: str
    evaluator: Literal["llm", "unavailable"]


class NextActivityRequest(BaseModel):
    learner: Learner = Field(default_factory=Learner)
    pending_activities: list[str] = Field(default_factory=list)
    revision_due: int = 0
    skill_averages: dict[str, Optional[float]] = Field(default_factory=dict)
    recent_exam_percents: dict[str, Optional[float]] = Field(default_factory=dict)


class Recommendation(BaseModel):
    next_kind: str
    reason: str
    ready_for_exam: bool
    ready_for_promotion: bool


class GenerateRequest(BaseModel):
    kind: Literal["lesson"]
    topic: str = Field(..., max_length=120)
    stage: int = Field(1, ge=1, le=5)
    level: int = Field(1, ge=1, le=8)


class PracticeItem(BaseModel):
    prompt: str
    kind: Literal["mcq", "fill", "free"]
    options: Optional[list[str]] = None
    answer: list[str] = Field(..., min_length=0)
    explanation: str


class GeneratedLesson(BaseModel):
    explanation: str
    explanation_ta: str
    rule: str
    basic_examples: list[str] = Field(..., min_length=5, max_length=5)
    professional_examples: list[str] = Field(..., min_length=5, max_length=5)
    practice: list[PracticeItem] = Field(..., min_length=3, max_length=8)
    model: Optional[str] = None
