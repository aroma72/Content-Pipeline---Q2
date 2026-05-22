from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, datetime
from uuid import uuid4


def new_id() -> str:
    return str(uuid4())


# ─── Perceive ──────────────────────────────────────────────────────────────────

class ContentSignal(BaseModel):
    id: str = Field(default_factory=new_id)
    source: Literal["learner_question", "repeated_confusion", "instructor_note", "assignment_pattern"]
    concept_id: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    observed_date: str
    priority: Literal["high", "medium", "low"] = "medium"


# ─── Plan ──────────────────────────────────────────────────────────────────────

class ContentUnit(BaseModel):
    id: str = Field(default_factory=new_id)
    outcome: str
    signal_ids: list[str]
    format: Literal["video", "interactive", "reading", "assignment"]
    status: Literal["draft", "ready_for_review", "published", "rebuild", "archived"] = "draft"
    created_date: str = Field(default_factory=lambda: str(date.today()))
    assigned_agent: str
    target_publish_date: str
    evidence_method: Literal["assignment", "quiz", "artifact"]


# ─── Act ───────────────────────────────────────────────────────────────────────

class LearnerPack(BaseModel):
    unit_id: str
    session_summary: str
    glossary: str
    watch_order: str
    key_concepts: list[str]
    common_misconceptions: list[dict]


class InstructorBrief(BaseModel):
    content_unit_id: str
    session_date: str
    already_know: list[str]
    likely_weak: list[str]
    do_not_reteach: list[str]
    explanation_variants: dict[str, list[str]]
    example_bank: list[dict]
    time_box_minutes: int


class Assignment(BaseModel):
    unit_id: str
    title: str
    description: str
    submission_type: Literal["commit", "writeup", "artifact", "quiz"]
    rubric: dict
    deadline_days: int = 5


# ─── Observe ───────────────────────────────────────────────────────────────────

class Segment(BaseModel):
    start_time: str
    end_time: str
    label: Literal["must_keep", "optional", "remove"]
    concept: str
    speaker: Optional[str] = None
    rationale: str


class QualityFlag(BaseModel):
    asset: str
    status: Literal["publish_ready", "needs_review"]
    issues: list[str] = []
    suggested_action: str = ""


class SessionAssetBundle(BaseModel):
    session_id: str = Field(default_factory=new_id)
    session_date: str
    course_id: str
    essential_edit_path: Optional[str] = None
    concept_clips: list[str] = []
    session_summary: Optional[str] = None
    glossary: Optional[str] = None
    watch_order: Optional[str] = None
    transcript_path: Optional[str] = None
    quality_flags: list[QualityFlag] = []
    status: Literal["draft", "needs_review", "publish_ready", "published"] = "draft"
    reviewed_by: Optional[str] = None
    published_date: Optional[str] = None


# ─── Reflect ───────────────────────────────────────────────────────────────────

class AssignmentEvaluation(BaseModel):
    unit_id: str
    total_submissions: int
    passed_first_attempt: int
    pass_rate_first_attempt: float
    avg_time_to_completion_minutes: float
    by_learner: list[dict] = []


class ContentHealthRecord(BaseModel):
    unit_id: str
    cycle_week: int
    assignment_attempt_rate: float
    assignment_pass_rate_first_attempt: float
    video_completion_rate: Optional[float] = None
    learner_feedback_sentiment: Optional[Literal["positive", "neutral", "negative"]] = None
    teacher_confidence: Optional[Literal["high", "medium", "low"]] = None
    decision: Literal["keep", "rebuild", "kill"]
    decision_rationale: str
    rebuild_priority: Optional[Literal["high", "medium", "low"]] = None


# ─── Orchestrator State ─────────────────────────────────────────────────────────

class OrchestratorState(BaseModel):
    cycle_week: int
    current_stage: Literal["perceive", "plan", "act", "observe", "reflect", "reentry", "blocked"]
    completed_units: list[str] = []
    pending_units: list[str] = []
    failed_units: list[str] = []
    gate_log: list[dict] = []
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ─── Video Production ──────────────────────────────────────────────────────────

class VideoProductionConfig(BaseModel):
    production_id: str = Field(default_factory=new_id)
    series_title: str
    script_path: str
    voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    voice_stability: float = 0.75
    total_videos: int = 4
    target_resolution: str = "1920x1080"
    fps: int = 30
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class SceneVoiceover(BaseModel):
    scene_id: str
    audio_path: str
    duration_seconds: float
    measured_duration_seconds: float = 0.0  # from ffprobe; 0.0 means not yet measured
    word_count: int
    quality_score: float = Field(ge=0.0, le=1.0)


class AnimationResult(BaseModel):
    scene_id: str
    video_path: str
    duration_seconds: float
    remotion_composition_id: str = ""
    render_output_path: str = ""
    quality_score: float = Field(ge=0.0, le=1.0)


class AssembledVideo(BaseModel):
    video_number: int
    title: str
    video_path: str
    duration_seconds: float
    scene_count: int
    has_captions: bool = False
    has_music: bool = False
    quality_score: float = Field(ge=0.0, le=1.0)


class PostProductionResult(BaseModel):
    video_number: int
    final_path: str
    srt_path: str
    duration_seconds: float
    audio_mixed: bool = False
    captions_burned: bool = False
    quality_score: float = Field(ge=0.0, le=1.0)


class QualityReport(BaseModel):
    step_name: str
    overall_score: float = Field(ge=0.0, le=1.0)
    passed: bool
    issues: list[str] = []
    recommendations: list[str] = []
    summary: str
    assessed_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class ReviewDecision(BaseModel):
    decision: Literal["approve", "redo", "redirect", "skip", "halt"]
    instructions: Optional[str] = None
    decided_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class VideoProductionState(BaseModel):
    production_id: str
    config: dict
    current_stage: Literal[
        "script", "voiceover", "animation", "assembly",
        "post_production", "qa", "distribution", "complete", "halted"
    ] = "script"
    voiceovers: list[dict] = []
    animations: list[dict] = []
    assembled_videos: list[dict] = []
    post_production_results: list[dict] = []
    quality_reports: list[dict] = []
    review_decisions: dict[str, dict] = {}
    distribution_urls: dict[str, str] = {}
    output_contract_failures: dict[str, dict] = {}  # Track output contract violations per stage
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None
