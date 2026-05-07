# Agents Directory

Specialized async worker agents for compute-heavy or parallelizable tasks. Called by orchestrator with callbacks.

## Agent List

### Video Processing Pipeline
- **[recording_ingest_agent.py](./recording_ingest_agent.py)** — RecordingIngestAgent
  - Input: raw video file path
  - Output: transcript.vtt + speaker_segments.json
  - Model: Claude Opus 4.7
  - Async: Yes (timeout: 90 min)

- **[concept_segmentation_agent.py](./concept_segmentation_agent.py)** — ConceptSegmentationAgent
  - Input: transcript.vtt + topic metadata
  - Output: segments.json (must_keep, optional, remove labels)
  - Model: Claude Opus 4.7
  - Async: Yes (timeout: 30 min)

- **[essential_edit_agent.py](./essential_edit_agent.py)** — EssentialEditAgent
  - Input: transcript + segments + speaker labels
  - Output: edit_timeline.json (frame ranges + transitions)
  - Calls ffmpeg to produce: essential_edit_draft.mp4
  - Model: Claude Opus 4.7
  - Async: Yes (timeout: 120 min; compute-heavy)

- **[micro_video_agent.py](./micro_video_agent.py)** — MicroVideoAgent
  - Input: must_keep segments (list)
  - Output: concept_clips/ (5+ MP4 files, 2-4 min each)
  - Calls ffmpeg in batch (parallel clips)
  - Model: Claude Opus 4.7
  - Async: Yes (timeout: 90 min; parallelizable)

- **[video_quality_gate_agent.py](./video_quality_gate_agent.py)** — VideoQualityGateAgent
  - Input: essential_edit.mp4 + concept_clips + metadata
  - Output: quality_flags (publish_ready | needs_review per clip)
  - Checks: audio quality, concept completeness, duration, privacy
  - Model: Claude Haiku 4.5
  - Async: Yes (timeout: 15 min; fast classification)

### Publishing Pipeline
- **[learner_pack_publisher_agent.py](./learner_pack_publisher_agent.py)** — LearnerPackPublisherAgent
  - Input: SessionAssetBundle (publish_ready)
  - Output: published/ folder + URLs (from LMS API)
  - Calls: Taleemabad LMS API
  - Model: Claude Haiku 4.5 (metadata generation only)
  - Async: Yes (timeout: 30 min; API I/O)

---

## Agent Template (Week 2-3 Implementation)

```python
import asyncio
from anthropic import Anthropic
import json
from typing import Callable

class MyAgent:
    def __init__(self, model="claude-opus-4-7", timeout_minutes=60):
        self.client = Anthropic()
        self.model = model
        self.timeout_seconds = timeout_minutes * 60
        self.system_prompt = open("../prompts/my_agent.txt").read()
    
    async def run_async(
        self, 
        input_data: dict, 
        callback: Callable = None
    ) -> dict:
        """
        Async agent execution with timeout + callback.
        
        Args:
            input_data: Input JSON
            callback: Function to call on completion (optional)
        
        Returns:
            result: Output JSON
        
        On timeout or error:
            - Logs to errors.log
            - Calls callback with error status
            - Orchestrator decides: retry, skip, or escalate
        """
        try:
            # Simulate async work (real implementation: call Claude API + ffmpeg)
            result = await asyncio.wait_for(
                self._execute(input_data),
                timeout=self.timeout_seconds
            )
            
            if callback:
                callback(status="success", result=result)
            
            return result
        
        except asyncio.TimeoutError:
            error = f"Agent timeout after {self.timeout_seconds}s"
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "error": error}
        
        except Exception as e:
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "error": str(e)}
    
    async def _execute(self, input_data: dict) -> dict:
        """Actual agent logic here"""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[
                {"role": "user", "content": json.dumps(input_data)}
            ]
        )
        
        output_text = message.content[0].text
        return json.loads(output_text)
```

---

## Pattern: All Agents Follow This

1. **Async**: All agents are async; called with callbacks
2. **Timeout**: Each agent has a defined timeout (see list above)
3. **Callback**: Orchestrator registers callback for completion notification
4. **State**: Results persisted to filesystem (not in-memory)
5. **Error**: On error/timeout, orchestrator decides next step (retry/skip/escalate)

---

## Orchestrator Integration

```python
# In ContentOrchestrator.observe():

async def observe_session(self, session_id):
    recording_path = f"./recordings/{session_id}.mp4"
    
    # Start RecordingIngestAgent
    ingest_agent = RecordingIngestAgent()
    transcript = await ingest_agent.run_async(
        input_data={"recording_path": recording_path},
        callback=self.on_ingest_complete
    )
    
    # Chain agents (each waits for prior to complete)
    segment_agent = ConceptSegmentationAgent()
    segments = await segment_agent.run_async(
        input_data={"transcript": transcript},
        callback=self.on_segment_complete
    )
    
    # EssentialEditAgent + MicroVideoAgent can run in parallel
    edit_agent = EssentialEditAgent()
    micro_agent = MicroVideoAgent()
    
    edit_task = asyncio.create_task(
        edit_agent.run_async(
            input_data={"transcript": transcript, "segments": segments},
            callback=self.on_edit_complete
        )
    )
    
    clips_task = asyncio.create_task(
        micro_agent.run_async(
            input_data={"segments": segments["must_keep"]},
            callback=self.on_clips_complete
        )
    )
    
    edit_result, clips_result = await asyncio.gather(
        edit_task, clips_task
    )
    
    # QA gate agent (fast, serial)
    qa_agent = VideoQualityGateAgent()
    qa_result = await qa_agent.run_async(
        input_data={"edit": edit_result, "clips": clips_result},
        callback=self.on_qa_complete
    )
    
    return SessionAssetBundle(
        essential_edit=edit_result,
        concept_clips=clips_result,
        quality_flags=qa_result
    )
```

---

## Testing Agents

Each agent has integration tests in `../tests/`:

```bash
pytest tests/test_recording_ingest_agent.py
pytest tests/test_essential_edit_agent.py
# etc.
```

Agents are tested with real sample videos (in `../tests/eval_dataset/sample_videos/`).

---

## Monitoring Agents

Each agent logs to `.claude/logs/`:
- Start: `Agent [name] started with timeout [secs]`
- Progress: `Agent [name] checkpoint: [step] complete`
- Complete: `Agent [name] completed in [secs], result: [summary]`
- Timeout: `Agent [name] TIMEOUT after [secs]`
- Error: `Agent [name] ERROR: [details]`

Orchestrator monitors logs + callbacks to detect failures.

---

## Performance Notes

- **RecordingIngestAgent**: 45-90 min (depends on video length + Whisper speed)
- **ConceptSegmentationAgent**: 15-30 min (LLM reasoning)
- **EssentialEditAgent**: 30-120 min (LLM + ffmpeg encode)
- **MicroVideoAgent**: 30-90 min (clips are parallelizable; ~15 min per clip × N)
- **VideoQualityGateAgent**: 5-10 min (light classification; Haiku is fast)
- **Total Observe pipeline**: 2-4 hours for 2-hour session (goal: <8 hours)

---

**All agents are called by ContentOrchestrator with async/await + callbacks (see planning/planning.md for orchestrator flow).**
