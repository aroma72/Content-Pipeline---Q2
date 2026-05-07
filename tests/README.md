# Tests Directory

Comprehensive testing for skills and agents. All tests must pass before production deployment.

## Structure

```
tests/
├── README.md .......................... This file
├── conftest.py ........................ Pytest fixtures + eval dataset loader
├── eval_dataset/ ...................... Reference data for testing
│   ├── sample_sessions/ ............... 3 pilot sessions + 1 blind held-out
│   │   ├── session_1/ ................ (AI Mastery, ~2 hours)
│   │   ├── session_2/ ................ (EQ, ~1.5 hours)
│   │   ├── session_3/ ................ (SQ, ~2.5 hours)
│   │   └── session_blind/ ............ (Held-out, not seen in training)
│   └── expected_outputs/ .............. Ground truth for each session
│       ├── session_1_units.json ....... Expected ContentUnits
│       ├── session_1_assignments.json . Expected assignment rubrics
│       └── ...
│
├── test_orchestrator.py ............... Orchestrator flow + gate logic
├── test_signal_intake.py .............. SignalIntakeSkill
├── test_content_planner.py ............ ContentPlannerSkill
├── test_content_producer.py ........... ContentProductionSkill
├── test_instructor_pack.py ............ InstructorPackSkill
├── test_assignment_authoring.py ....... AssignmentAuthoringSkill
├── test_assignment_evaluation.py ...... AssignmentEvaluationSkill
├── test_content_reflect.py ............ ContentReflectSkill
├── test_recording_ingest_agent.py .... RecordingIngestAgent
├── test_concept_segmentation_agent.py  ConceptSegmentationAgent
├── test_essential_edit_agent.py ....... EssentialEditAgent
├── test_micro_video_agent.py .......... MicroVideoAgent
├── test_video_quality_gate_agent.py ... VideoQualityGateAgent
└── test_learner_pack_publisher_agent.py LearnerPackPublisherAgent
```

---

## Test Execution

### Run All Tests
```bash
pytest tests/ -v
```

### Run Specific Skill Tests
```bash
pytest tests/test_signal_intake.py -v
pytest tests/test_content_planner.py -v
```

### Run With Coverage
```bash
pytest tests/ --cov=skills --cov=agents --cov-report=html
```

### Run on Eval Dataset Only
```bash
pytest tests/ -m "eval_dataset" -v
```

---

## Test Patterns

### Skill Test Template

```python
import pytest
from skills.signal_intake import SignalIntakeSkill

class TestSignalIntakeSkill:
    
    @pytest.fixture
    def skill(self):
        return SignalIntakeSkill()
    
    @pytest.fixture
    def sample_input(self):
        return {
            "signals": [
                {"source": "forum", "text": "Learner question about X"},
                {"source": "instructor", "text": "Many students confused on Y"}
            ]
        }
    
    def test_output_schema(self, skill, sample_input):
        """Verify output matches ContentSignal schema"""
        result = skill.call(sample_input)
        assert result.status == "success"
        assert all(hasattr(item, "id") for item in result.signals)
        assert all(0 <= item.confidence <= 1 for item in result.signals)
    
    def test_eval_dataset(self, skill):
        """Test on real prior session data"""
        with open("eval_dataset/session_1/signals.json") as f:
            input_data = json.load(f)
        
        result = skill.call(input_data)
        expected = load_expected("eval_dataset/expected_outputs/session_1_signals.json")
        
        # Check semantic match (not exact match; LLM can vary wording)
        assert similarity(result, expected) >= 0.85
    
    def test_error_handling(self, skill):
        """Verify errors are logged, not raised"""
        bad_input = {"signals": []}  # Missing required field
        result = skill.call(bad_input)
        assert result.status == "error"
        assert result.error is not None
```

### Agent Test Template

```python
import pytest
import asyncio
from agents.recording_ingest_agent import RecordingIngestAgent

class TestRecordingIngestAgent:
    
    @pytest.fixture
    def agent(self):
        return RecordingIngestAgent(timeout_minutes=5)  # Short timeout for testing
    
    @pytest.mark.asyncio
    async def test_transcript_generation(self, agent):
        """Verify agent produces valid transcript"""
        session_path = "eval_dataset/sample_sessions/session_1/recording.mp4"
        
        result = await agent.run_async(
            input_data={"recording_path": session_path},
            callback=None
        )
        
        assert result["status"] == "success"
        assert "transcript" in result
        assert "speaker_segments" in result
    
    @pytest.mark.asyncio
    async def test_wer_accuracy(self, agent):
        """Verify word error rate < 5%"""
        session_path = "eval_dataset/sample_sessions/session_1/recording.mp4"
        
        result = await agent.run_async(
            input_data={"recording_path": session_path}
        )
        
        expected_transcript = load_expected("eval_dataset/expected_outputs/session_1_transcript.vtt")
        wer = calculate_wer(result["transcript"], expected_transcript)
        
        assert wer < 0.05, f"WER {wer} exceeds 5% threshold"
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self, agent):
        """Verify timeout returns error, doesn't hang"""
        result = await agent.run_async(
            input_data={"recording_path": "nonexistent.mp4"}
        )
        
        assert result["status"] in ["error", "timeout"]
```

---

## Pass Criteria (From ref_anthropic_practices.md)

| Component | Metric | Target |
|-----------|--------|--------|
| **RecordingIngestAgent** | WER (word error rate) | <5% |
| **ConceptSegmentationAgent** | Segment relevance (human review) | ≥85% of must_keep segments are essential |
| **EssentialEditAgent** | Instructor approval | ≥4/5 (80%+) |
| **MicroVideoAgent** | Duration compliance | 100% of clips 2-4 minutes |
| **VideoQualityGateAgent** | False positive rate | <10% flagged-but-fine clips |
| **ContentPlannerSkill** | Signal mapping | 100% of signals in unit list |
| **ContentProductionSkill** | Learner clarity | ≥75% learner survey = "clear" |
| **AssignmentAuthoringSkill** | Rubric validity | ≥80% TA agreement on pass/fail |

**All components must meet pass criteria before shipping to production.**

---

## Eval Dataset

Located in `eval_dataset/`:

### 3 Pilot Sessions (Diverse Coverage)
1. **session_1/**: AI Mastery module, ~2 hours, clear audio, structured lesson
   - `recording.mp4`, `slides.pdf`, `ground_truth/`
   
2. **session_2/**: Emotional Quotient module, ~1.5 hours, conversational tone
   - `recording.mp4`, `ground_truth/`
   
3. **session_3/**: Social Quotient module, ~2.5 hours, group discussion, background noise
   - `recording.mp4`, `ground_truth/`

### 1 Blind Held-Out Session
- **session_blind/**: Not used during prompt development; final validation only
- Kept secret until Week 4 final validation

### Ground Truth Files
Each session has:
- `signals.json` — Raw signals (forum posts, instructor confusion notes)
- `expected_units.json` — Correct ContentUnits + outcomes
- `expected_assignments.json` — Assignment rubrics + expected submissions
- `transcript.vtt` — Reference transcript (for WER calculation)
- `segments.json` — Concept segments with must_keep labels
- `edit_timeline.json` — Expected edit decision (which sections to keep/remove)

---

## Continuous Evaluation (Week 1-4)

### Week 1
- [ ] Eval dataset prepared (3 sessions + 1 blind)
- [ ] Test templates created
- [ ] conftest.py with fixtures ready

### Week 2
- [ ] All skill tests written + passing on eval dataset
- [ ] Pass criteria verified for each skill (>80% meet targets)

### Week 3
- [ ] All agent tests written + passing on eval dataset
- [ ] Video pipeline timing validated (<8 hours per session)

### Week 4
- [ ] Orchestrator integration tests passing
- [ ] Final validation on blind held-out session
- [ ] All metrics within targets before production

---

## Performance Benchmarks

Expected runtimes (on eval dataset sessions):

| Component | Runtime | Note |
|-----------|---------|------|
| SignalIntakeSkill | 2 min | LLM call only |
| ContentPlannerSkill | 3 min | Reason over signals |
| ContentProductionSkill | 5 min | Generate learning materials |
| RecordingIngestAgent | 45 min | Whisper transcription (~2 hr video) |
| ConceptSegmentationAgent | 15 min | LLM reasoning |
| EssentialEditAgent | 45 min | LLM + ffmpeg encode |
| MicroVideoAgent | 60 min | LLM + ffmpeg batch (5 clips) |
| VideoQualityGateAgent | 5 min | Fast Haiku classification |
| **Total per 2-hour session** | **2-4 hours** | Goal: <8 hrs |

---

## Mocking & Fixtures (conftest.py)

Key fixtures:
```python
@pytest.fixture
def sample_signal():
    """Mock signal data"""
    return {...}

@pytest.fixture
def sample_content_unit():
    """Mock content unit"""
    return {...}

@pytest.fixture
def eval_dataset_loader():
    """Load eval dataset session"""
    def _load(session_name):
        return load_json(f"eval_dataset/{session_name}/...")
    return _load

@pytest.fixture
def mock_claude_api():
    """Mock Claude API calls (for unit tests)"""
    ...
```

---

## CI/CD Integration (Week 3+)

Tests should run on every commit:

```yaml
# Example GitHub Actions workflow
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=skills --cov=agents
      - run: python -m pytest tests/ -m "eval_dataset"
```

---

## Reporting

Test results are logged to:
- `.claude/logs/session.log` — Test execution trace
- `tests/results.html` — Coverage report (with `--cov-report=html`)
- `tests/test_results.json` — Machine-readable results (for dashboard)

---

**All tests must pass before production. No exceptions.**
