"""
conftest.py — pytest fixtures for Drawing Room tests.

Provides:
- Mock Claude API client (to avoid token usage during testing)
- Eval dataset loader (real session data for validation tests)
- Sample signal/unit/pack fixtures
- Utility functions (WER calculation, similarity scoring)
"""
import json
import sys
from pathlib import Path
from typing import Any

import pytest
from unittest.mock import Mock, MagicMock

# Ensure imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import ContentSignal, ContentUnit, LearnerPack, InstructorBrief


# ─── Evaluation Dataset Loader ──────────────────────────────────────────────────

EVAL_DATASET_DIR = Path(__file__).parent / "eval_dataset"


def load_eval_data(session_name: str, file_name: str) -> dict:
    """Load evaluation dataset file for a session."""
    path = EVAL_DATASET_DIR / "sample_sessions" / session_name / file_name
    if not path.exists():
        raise FileNotFoundError(f"Eval data not found: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_expected_output(session_name: str, file_name: str) -> dict:
    """Load expected output (ground truth) for a session."""
    path = EVAL_DATASET_DIR / "expected_outputs" / f"{session_name}_{file_name}"
    if not path.exists():
        raise FileNotFoundError(f"Expected output not found: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ─── Mock Anthropic Client ─────────────────────────────────────────────────────

@pytest.fixture
def mock_anthropic_client():
    """Mock Claude API client to avoid token usage in tests."""
    client = Mock()
    client.messages = Mock()
    client.messages.create = MagicMock()
    return client


@pytest.fixture
def mock_response(request):
    """Create a mock response object."""
    response = Mock()
    response.content = [Mock()]

    # Allow parametrization of response content
    if hasattr(request, "param"):
        response.content[0].text = request.param
    else:
        response.content[0].text = "{}"

    return response


# ─── Sample Data Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def sample_signal():
    """A valid ContentSignal for testing."""
    return {
        "id": "sig-001",
        "source": "learner_question",
        "concept_id": "gradient_descent",
        "description": "Learner confused about why we subtract the gradient.",
        "confidence": 0.85,
        "observed_date": "2026-05-20",
        "priority": "high"
    }


@pytest.fixture
def sample_signals():
    """Multiple sample signals."""
    return [
        {
            "id": "sig-001",
            "source": "learner_question",
            "concept_id": "gradient_descent",
            "description": "Why do we subtract instead of add?",
            "confidence": 0.85,
            "observed_date": "2026-05-20",
            "priority": "high"
        },
        {
            "id": "sig-002",
            "source": "repeated_confusion",
            "concept_id": "backpropagation",
            "description": "Multiple learners confused about gradient flow.",
            "confidence": 0.75,
            "observed_date": "2026-05-20",
            "priority": "medium"
        },
        {
            "id": "sig-003",
            "source": "assignment_pattern",
            "concept_id": "learning_rate",
            "description": "75% of learners use default LR without tuning.",
            "confidence": 0.8,
            "observed_date": "2026-05-20",
            "priority": "high"
        }
    ]


@pytest.fixture
def sample_content_unit():
    """A valid ContentUnit for testing."""
    return {
        "id": "unit-001",
        "outcome": "Explain gradient descent in own words",
        "signal_ids": ["sig-001"],
        "format": "video",
        "assigned_agent": "ContentProductionSkill",
        "target_publish_date": "2026-05-25",
        "evidence_method": "assignment"
    }


@pytest.fixture
def sample_learner_pack():
    """A valid LearnerPack for testing."""
    return {
        "unit_id": "unit-001",
        "session_summary": "# Gradient Descent\n\nLearn how to optimize neural networks.",
        "glossary": "| Term | Definition | Example |\n|---|---|---|\n| Gradient | Rate of change | ∇L |\n",
        "watch_order": "1. Essential edit\n2. Concept clips\n",
        "key_concepts": ["Gradient", "Optimization", "Learning Rate"],
        "common_misconceptions": [
            {"misconception": "Higher LR = faster convergence", "clarification": "Can cause divergence."}
        ]
    }


@pytest.fixture
def sample_instructor_brief():
    """A valid InstructorBrief for testing."""
    return {
        "content_unit_id": "unit-001",
        "session_date": "2026-05-20",
        "already_know": ["Calculus basics"],
        "likely_weak": ["Chain rule in multivariable calculus"],
        "do_not_reteach": ["Basic derivatives"],
        "explanation_variants": {
            "gradient": ["Think of a hill slope", "Mathematical partial derivatives", "Vector of rates"]
        },
        "example_bank": [
            {"title": "Simple parabola", "code_or_scenario": "y = x^2", "difficulty": "easy"}
        ],
        "time_box_minutes": 45
    }


# ─── Eval Dataset Fixtures ─────────────────────────────────────────────────────

@pytest.fixture
def eval_dataset_session_1():
    """Eval dataset for session_1 (AI Mastery, ~2 hours)."""
    return {
        "signals": load_eval_data("session_1", "signals.json"),
        "expected_units": load_expected_output("session_1", "units.json"),
        "expected_assignments": load_expected_output("session_1", "assignments.json")
    }


@pytest.fixture
def eval_dataset_session_2():
    """Eval dataset for session_2 (EQ, ~1.5 hours)."""
    return {
        "signals": load_eval_data("session_2", "signals.json"),
        "expected_units": load_expected_output("session_2", "units.json"),
        "expected_assignments": load_expected_output("session_2", "assignments.json"),
    }


@pytest.fixture
def eval_dataset_session_3():
    """Eval dataset for session_3 (SQ, ~2.5 hours)."""
    return {
        "signals": load_eval_data("session_3", "signals.json"),
        "expected_units": load_expected_output("session_3", "units.json"),
        "expected_assignments": load_expected_output("session_3", "assignments.json"),
    }


# ─── Utility Functions ─────────────────────────────────────────────────────────

def calculate_wer(actual: str, expected: str) -> float:
    """Calculate Word Error Rate (Levenshtein distance / total words)."""
    actual_words = actual.lower().split()
    expected_words = expected.lower().split()

    if not expected_words:
        return 0.0

    # Simple WER: (substitutions + deletions + insertions) / reference_length
    # For quick testing, use edit distance approximation
    from difflib import SequenceMatcher
    matcher = SequenceMatcher(None, actual_words, expected_words)
    ratio = matcher.ratio()
    return 1.0 - ratio


def calculate_similarity(actual: dict | str, expected: dict | str) -> float:
    """Calculate semantic similarity (0-1)."""
    if isinstance(actual, dict) and isinstance(expected, dict):
        # Simple JSON similarity: count matching keys
        actual_keys = set(actual.keys())
        expected_keys = set(expected.keys())
        if not expected_keys:
            return 1.0
        overlap = len(actual_keys & expected_keys)
        return overlap / len(expected_keys)

    # String similarity
    if isinstance(actual, str) and isinstance(expected, str):
        from difflib import SequenceMatcher
        return SequenceMatcher(None, actual, expected).ratio()

    return 0.0


# ─── Markers ───────────────────────────────────────────────────────────────────

def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "eval_dataset: test uses evaluation dataset")
    config.addinivalue_line("markers", "unit: unit test (no LLM calls)")
    config.addinivalue_line("markers", "integration: integration test (with LLM)")
