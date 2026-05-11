import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ─── API Keys ──────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")        # for Whisper
LMS_API_KEY       = os.getenv("LMS_API_KEY", "")
LMS_BASE_URL      = os.getenv("LMS_BASE_URL", "https://api.taleemabad.com")

# ─── Models ────────────────────────────────────────────────────────────────────
MODEL_OPUS   = "claude-opus-4-7"
MODEL_SONNET = "claude-sonnet-4-6"
MODEL_HAIKU  = "claude-haiku-4-5-20251001"

# ─── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR       = Path(__file__).parent
RECORDINGS_DIR = BASE_DIR / "recordings"
DRAFTS_DIR     = BASE_DIR / "drafts"
PUBLISHED_DIR  = BASE_DIR / "published"
REVIEW_DIR     = BASE_DIR / "review_queue"
ARTIFACTS_DIR  = BASE_DIR / "weekly_artifacts"
PROMPTS_DIR    = BASE_DIR / "prompts"

for d in [RECORDINGS_DIR, DRAFTS_DIR, PUBLISHED_DIR, REVIEW_DIR, ARTIFACTS_DIR, PROMPTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Quality Thresholds ────────────────────────────────────────────────────────
MIN_SIGNAL_CONFIDENCE  = 0.6
MIN_CLARITY_SCORE      = 0.7
MIN_PASS_RATE          = 0.80
MAX_COST_PER_WEEK      = 50.0
MAX_OBSERVE_HOURS      = 8
CLIP_MIN_SECONDS       = 120    # 2 min
CLIP_MAX_SECONDS       = 240    # 4 min

# ─── Human Review ──────────────────────────────────────────────────────────────
AROMA_EMAIL = "aroma.tahir@taleemabad.com"
REVIEW_SLA_HOURS = 24

# Video Production API Keys
ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "")
RUNWAY_API_KEY      = os.getenv("RUNWAY_API_KEY", "")
ASSEMBLYAI_API_KEY  = os.getenv("ASSEMBLYAI_API_KEY", "")
ROEX_API_KEY        = os.getenv("ROEX_API_KEY", "")
JSON2VIDEO_API_KEY  = os.getenv("JSON2VIDEO_API_KEY", "")
VIZARD_API_KEY      = os.getenv("VIZARD_API_KEY", "")
YOUTUBE_API_KEY     = os.getenv("YOUTUBE_API_KEY", "")

# Video Production Paths
VIDEO_PRODUCTION_DIR = BASE_DIR / "video_production"
VIDEO_PRODUCTION_DIR.mkdir(parents=True, exist_ok=True)

# Video Production Thresholds
MIN_VOICEOVER_QUALITY  = 0.80
MIN_ANIMATION_QUALITY  = 0.75
MIN_ASSEMBLY_QUALITY   = 0.80
MIN_POST_PROD_QUALITY  = 0.85
REVIEW_TIMEOUT_SECONDS = 300
REMOTION_PROJECT_DIR = "C:\\Users\\Aroma Tahir\\Downloads\\drawing-room-remotion"

# ─── Rate Limiting Configuration ───────────────────────────────────────────────
# Initialize rate limiters on module load
from agents.rate_limiting import configure_rate_limits, DEFAULT_RATE_LIMITS
configure_rate_limits(DEFAULT_RATE_LIMITS)