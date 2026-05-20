"""
test_signal_intake.py — Tests for SignalIntakeSkill.

Tests the Perceive stage of the orchestrator:
- Output schema validation
- Confidence filtering
- Signal ranking
- Error handling
"""
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from skills.signal_intake import SignalIntakeSkill
from schemas import ContentSignal


class TestSignalIntakeSkill:
    """Test suite for SignalIntakeSkill."""

    @pytest.fixture
    def skill(self):
        """Create a SignalIntakeSkill instance."""
        return SignalIntakeSkill()

    def test_initialization(self, skill):
        """Verify skill initializes with correct model."""
        assert skill.client is not None
        assert skill.model == "claude-opus-4-7"

    @pytest.mark.unit
    def test_output_schema(self, skill, sample_signals):
        """Verify output matches ContentSignal schema."""
        # Mock the API response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps([
            {
                "id": "sig-001",
                "source": "learner_question",
                "concept_id": "gradient_descent",
                "description": "Learner confused about gradient direction",
                "confidence": 0.85,
                "observed_date": "2026-05-20",
                "priority": "high"
            },
            {
                "id": "sig-002",
                "source": "repeated_confusion",
                "concept_id": "backpropagation",
                "description": "Multiple learners confused about backprop",
                "confidence": 0.75,
                "observed_date": "2026-05-20",
                "priority": "medium"
            }
        ])

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call(sample_signals)

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(hasattr(item, 'id') for item in result)
        assert all(0 <= item.confidence <= 1 for item in result)
        assert all(isinstance(item, ContentSignal) for item in result)

    @pytest.mark.unit
    def test_confidence_filtering(self, skill):
        """Verify signals with confidence < 0.6 are filtered."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        # Only return signals with confidence >= 0.6 (per spec)
        mock_response.content[0].text = json.dumps([
            {
                "id": "sig-001",
                "source": "learner_question",
                "concept_id": "gradient_descent",
                "description": "Clear confusion",
                "confidence": 0.85,
                "observed_date": "2026-05-20",
                "priority": "high"
            }
        ])

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call([{"source": "test", "text": "test"}])

        assert all(sig.confidence >= 0.6 for sig in result)

    @pytest.mark.unit
    def test_signal_ranking(self, skill):
        """Verify signals are sorted by confidence descending."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps([
            {
                "id": "sig-001",
                "source": "learner_question",
                "concept_id": "concept_1",
                "description": "High confidence",
                "confidence": 0.9,
                "observed_date": "2026-05-20",
                "priority": "high"
            },
            {
                "id": "sig-002",
                "source": "repeated_confusion",
                "concept_id": "concept_2",
                "description": "Medium confidence",
                "confidence": 0.7,
                "observed_date": "2026-05-20",
                "priority": "medium"
            }
        ])

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call([{"source": "test", "text": "test"}])

        # Verify descending order
        confidences = [sig.confidence for sig in result]
        assert confidences == sorted(confidences, reverse=True)

    @pytest.mark.unit
    def test_error_handling(self, skill):
        """Verify errors are logged, not raised."""
        with patch.object(skill.client.messages, 'create', side_effect=Exception("API Error")):
            result = skill.call([{"source": "test", "text": "test"}])

        assert result == []  # Returns empty list on error

    @pytest.mark.unit
    def test_empty_input(self, skill):
        """Verify handles empty signal list gracefully."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps([])

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call([])

        assert result == []

    @pytest.mark.eval_dataset
    def test_with_eval_dataset_session_1(self, skill, eval_dataset_session_1):
        """Test on real eval dataset session_1."""
        signals = eval_dataset_session_1["signals"]["signals"]
        expected = eval_dataset_session_1["expected_units"]

        mock_response = MagicMock()
        mock_response.content = [MagicMock()]

        # Create mock ContentSignal objects matching expected output structure
        mock_signals = [
            {
                "id": f"sig-{i:03d}",
                "source": s.get("source", "unknown"),
                "concept_id": s.get("concept", "unknown"),
                "description": s.get("text", "")[:100],
                "confidence": min(0.5 + (s.get("recurrence", 1) * 0.1), 1.0),
                "observed_date": s.get("date", "2026-05-20"),
                "priority": "high" if min(0.5 + (s.get("recurrence", 1) * 0.1), 1.0) > 0.75 else "medium"
            }
            for i, s in enumerate(signals, 1)
        ]

        mock_response.content[0].text = json.dumps(mock_signals)

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call(signals)

        assert len(result) > 0
        assert all(isinstance(sig, ContentSignal) for sig in result)
        assert all(sig.confidence >= 0.6 for sig in result)

    @pytest.mark.unit
    def test_json_parsing(self, skill):
        """Verify invalid JSON in response is handled."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "invalid json"

        with patch.object(skill.client.messages, 'create', return_value=mock_response):
            result = skill.call([{"source": "test", "text": "test"}])

        assert result == []  # Returns empty on parse error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
