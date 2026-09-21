---
name: Anthropic Agent Best Practices & Patterns
description: Design principles, tool use patterns, prompt caching, and hooks from Anthropic documentation
type: reference
---

## Core Principles (From Anthropic Docs)

### 1. Start Simple, Grow Deliberately
- ✅ Begin with one orchestrator + skill modules
- ✅ Measure success before splitting into workers
- ✅ Add specialized agents only when single-agent proves insufficient
- ❌ Don't over-engineer multi-agent systems prematurely

### 2. Define Clear Tool Boundaries
- ✅ Each skill has specific inputs (schemas) and outputs (schemas)
- ✅ Tool calls are deterministic, logged, and retryable
- ✅ Use tool definitions to constrain LLM behavior
- ❌ Don't chain tool calls inside prompts; let orchestrator control flow

### 3. Use Structured Outputs
- ✅ Skills return JSON/Pydantic models, not freeform text
- ✅ Schemas are validated before next step
- ✅ Validation errors are logged and trigger replanning
- ❌ Don't accept "close enough" LLM outputs; require validation

### 4. Implement Clear Gates & Checkpoints
- ✅ Weekly loop gates are explicit, logged, and monitored
- ✅ Human review checkpoints are built in (Aroma's approval)
- ✅ Failures are caught early, not propagated downstream
- ❌ Don't assume everything will work; design for failures

### 5. Iterate on Real Data, Not Synthetic
- ✅ Use 3-5 real prior sessions for eval dataset
- ✅ Test agents on held-out blind sessions before production
- ✅ Measure on actual learner outcomes (assignment pass rate, completion)
- ❌ Don't assume prompt engineering alone = production quality

---

## Tool Use Patterns (Drawing Room Specific)

### Skills as Orchestrator-Managed Tools
```
ContentOrchestrator.call_skill(
  skill_name="SignalIntakeSkill",
  input={"signals_raw": [...], "confidence_threshold": 0.6},
  expected_output_schema=ContentSignal_List,
  on_error="log_and_escalate",
  retry_count=1
)
```

**Pattern:**
- Orchestrator owns the call loop and retry logic
- Each skill is deterministic (same input → same output)
- Skills are versioned (v1.0, v1.1 with prompt changes)
- Failures are catchable; orchestrator decides: retry, skip, or escalate

### Video Processing as Async Workers
```
VideoOrchestrator.enqueue_job(
  job_type="EssentialEditAgent",
  input={"transcript": vtt, "segments": json},
  timeout_minutes=120,
  callback=on_edit_complete,
  on_timeout="publish_draft_and_alert"
)
```

**Pattern:**
- Async tools have explicit timeouts and callbacks
- Results are stored in shared state (filesystem or DB)
- Orchestrator polls or listens for completion
- Timeouts don't block the weekly loop

---

## Prompt Caching (For Cost Reduction)

### Caching Opportunities in Drawing Room

1. **ContentPlannerSkill**
   - Cache: ContentSignal schema (constant), past unit examples (3-5), rubric
   - Input: signal_backlog (varies per week)
   - Cache hit ratio: ~70-80% (schema + examples reused, new signals each week)
   - **Savings**: ~20% tokens per plan run

2. **ContentProductionSkill**
   - Cache: learner template, rubric examples, tone guidelines
   - Input: ContentUnit (varies per session)
   - Cache hit ratio: ~60-70%
   - **Savings**: ~15% tokens per generation

3. **VideoQualityGateAgent**
   - Cache: quality checklist, sample good/bad transcripts
   - Input: candidate clip (varies per session)
   - Cache hit ratio: ~80-90%
   - **Savings**: ~25% tokens per QA pass

### Implementation Notes
- Cache control headers set on schema/template definitions (rarely change)
- Cache TTL: 5 minutes (within single session) or 24 hours (cross-session)
- Monitor cache hit rates in Week 2; adjust cached content if hit rate drops

---

## Error Handling & Retry Logic

### Retryable Errors
- Transient API failures (rate limit, 500 error) → retry with exponential backoff
- Whisper transcription timeouts → retry with lower audio quality
- LMS API 503 (service down) → queue for retry next hour

### Non-Retryable Errors
- Invalid input schema → log and escalate to Aroma (manual intervention needed)
- Claude API quota exceeded → gate blocked; escalate to Aroma
- File corrupted (can't parse JSON) → skip unit, log, move to next

### Error Log Format
```
{
  "timestamp": "2026-05-10T14:30:00Z",
  "error_type": "TranscriptionTimeout",
  "skill": "RecordingIngestAgent",
  "session_id": "sess_abc123",
  "attempt": 1,
  "action": "retry_with_lower_bitrate",
  "resolved": true/false,
  "escalation": "Aroma notified if false"
}
```

---

## Memory & State Management

### Session-Level State
- Orchestrator maintains: current_stage, completed_units, pending_flags
- Cleared at end of weekly cycle
- Logged to decision_log for audit

### Cross-Session State
- ContentUnit definitions: persisted in `weekly_artifacts/`
- Decision history: persisted in `decision_log/`
- Learner submission data: pulled from LMS API per cycle (no local cache)

### Memory File Updates (Per Hook at 95% Context)
- `MEMORY.md` index updated with new key decisions
- Key memory files updated: project_timeline.md (if milestones changed), feedback files (if new constraints discovered)
- Session logs archived to `.claude/logs/`

---

## Hooks Configuration (Drawing Room Setup)

### Context Window Monitoring
```json
{
  "context_window_threshold_percent": 95,
  "on_context_95_percent": {
    "actions": ["update_memory_files", "flush_session_logs", "checkpoint_planning_state"],
    "notification": "show"
  }
}
```

### Tool Logging Hooks
```json
{
  "before_tool_call": {"log_tool_name": true, "save_input_to_log": true},
  "after_tool_call": {"save_result_summary": true, "check_for_errors": true}
}
```

### Session Lifecycle Hooks
```json
{
  "on_session_start": {"load_memory": true, "load_project_context": true},
  "on_session_end": {"archive_session_log": true, "update_memory_index": true}
}
```

---

## Model Selection & Capabilities

### Claude Opus 4.7
- **Use for**: Planning (reasoning over signals), reflection (comparing outcomes)
- **Why**: Best reasoning ability; handles multi-step logic
- **Cost**: ~$15 per 1M input tokens (expensive; use sparingly)

### Claude Sonnet 4.6
- **Use for**: Content generation (learner packs, instructor briefs)
- **Why**: High quality output at good speed/cost ratio; balanced
- **Cost**: ~$3 per 1M input tokens (sweet spot for production)

### Claude Haiku 4.5
- **Use for**: QA checks, classification (keep/rebuild/kill), tagging
- **Why**: Fast, cheap, sufficient for binary/lightweight decisions
- **Cost**: ~$0.80 per 1M input tokens (use for high-volume checks)

---

## Testing & Evaluation Checklist (Week 1)

- [ ] Schemas validated against 3 real prior session datasets
- [ ] Each skill pass criteria defined + documented
- [ ] Prompt examples curated (3-5 per skill for caching)
- [ ] Error scenarios mapped (what can fail? how to detect?)
- [ ] Fallback paths documented (if skill fails, what's the backup?)
- [ ] Eval dataset prepared: 3 pilot sessions + 1 blind held-out
- [ ] Cost estimates per skill obtained (based on real prompts)
- [ ] Hook configuration tested in dry run

---

## Further Reading
- [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- [Prompt Caching (Anthropic Docs)](https://docs.anthropic.com/claude/guides/prompt-caching)
- [Tool Use Patterns](https://docs.anthropic.com/claude/guides/tool-use)
