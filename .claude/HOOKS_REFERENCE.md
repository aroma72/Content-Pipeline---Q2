# Hooks Reference & Configuration Guide

This guide documents all hooks configured for Drawing Room and recommends additional hooks for future phases, per Anthropic best practices.

---

## Current Configuration (Week 0 Setup)

### Context Window Monitoring (CONFIGURED ✅)

**Hook Name**: `on_context_95_percent`

**Trigger**: Context window reaches 95% capacity

**Actions**:
1. Flush session logs → `./claude/logs/session.log`
2. Update memory files (MEMORY.md + key memory files)
3. Checkpoint planning state (save plan file)
4. Show user notification

**Configuration** (in `.claude/settings.json`):
```json
{
  "context_window_threshold_percent": 95,
  "on_context_95_percent": {
    "actions": [
      "update_memory_files",
      "flush_session_logs",
      "checkpoint_planning_state"
    ],
    "notification": "show",
    "message": "⚠️  Context window at 95%. Memory, logs, and plan state have been persisted. Consider ending session soon or starting a fresh context."
  }
}
```

**Why**: Prevents mid-session context loss. All decisions, memory, and logs are persisted before context overflow.

**Testing**: Manually invoke by reading large files until context hits 95%.

---

### Tool Logging (CONFIGURED ✅)

**Hook Name**: `before_tool_call`

**Trigger**: Before any tool (Bash, Read, Write, etc.) is executed

**Actions**:
1. Log tool name
2. Save input to session log

**Configuration**:
```json
{
  "before_tool_call": {
    "log_tool_name": true,
    "save_input_to_log": true
  }
}
```

**Example Log Entry**:
```
2026-05-04 16:45:15 DEBUG Tool Bash: command='git status'
```

**Why**: Creates operational audit trail; helps troubleshoot tool failures.

---

**Hook Name**: `after_tool_call`

**Trigger**: After tool completes (success or failure)

**Actions**:
1. Log result summary
2. Check for errors; log if found

**Configuration**:
```json
{
  "after_tool_call": {
    "save_result_summary": true,
    "check_for_errors": true
  }
}
```

**Example Log Entry**:
```
2026-05-04 16:45:16 INFO Tool Bash completed: exit_code=0, output_lines=15
2026-05-04 16:45:17 ERROR Tool Bash failed: exit_code=1, error="File not found"
```

**Why**: Detects tool failures early; logs enable troubleshooting.

---

### Session Lifecycle (CONFIGURED ✅)

**Hook Name**: `on_session_start`

**Trigger**: Claude Code session begins

**Actions**:
1. Load memory files into context
2. Load project context (CLAUDE.md, planning.md)

**Configuration**:
```json
{
  "on_session_start": {
    "load_memory": true,
    "load_project_context": true
  }
}
```

**Why**: Next session starts with full context; no cold start. Aroma doesn't need to brief Claude on the project each session.

---

**Hook Name**: `on_session_end`

**Trigger**: Claude Code session ends (user closes, or timeout)

**Actions**:
1. Archive session log to `./claude/logs/archive/`
2. Update memory index (MEMORY.md)
3. Commit any new memory files to knowledge base

**Configuration**:
```json
{
  "on_session_end": {
    "archive_session_log": true,
    "update_memory_index": true
  }
}
```

**Why**: Clean shutdown; persists learning for next session.

---

### Memory Auto-Save (CONFIGURED ✅)

**Hook Name**: `auto_save_memory`

**Trigger**: Periodically (every 5 minutes during session)

**Actions**:
1. Save any modified memory files
2. Verify memory index is up-to-date

**Configuration**:
```json
{
  "memory": {
    "auto_save_interval_seconds": 300,
    "checkpoint_on_tool_completion": true,
    "retention_days": 90
  }
}
```

**Why**: Memory changes are persisted incrementally; no loss if session crashes.

---

## Recommended Additional Hooks (Week 1-4 Phased Implementation)

### ✅ Phase 0 (Done): Foundation
- [x] Context window monitoring
- [x] Tool logging
- [x] Session lifecycle
- [x] Memory auto-save

---

### Phase 1: Gate Monitoring (Implement Week 1)

**Hook Name**: `on_gate_transition`

**Purpose**: Log when the orchestrator moves between loop stages (Perceive → Plan → Act → Observe → Reflect)

**Trigger**: Orchestrator transitions from one stage to next

**Suggested Actions**:
1. Log gate name + status (success or extended)
2. Log timestamp + gate rationale (why passed or why extended?)
3. Emit structured event to `decisions.log`

**Sample Configuration**:
```json
{
  "on_gate_transition": {
    "log_gate_name": true,
    "log_status": true,
    "emit_to_decisions_log": true,
    "notification_on_failure": "show"
  }
}
```

**Example Log Entry**:
```json
{
  "timestamp": "2026-05-10T18:00:00Z",
  "event": "gate_transition",
  "from_stage": "Plan",
  "to_stage": "Act",
  "status": "success",
  "gate_passed": true,
  "reason": "All 3 content units mapped to signals"
}
```

**When to Add**: Once orchestrator skeleton is implemented (Week 2 start).

---

### Phase 2: Cost Monitoring (Implement Week 2)

**Hook Name**: `on_cost_alert`

**Purpose**: Alert if API + compute costs exceed weekly budget ($50)

**Trigger**: Cumulative weekly cost approaches threshold; fires at 75% and 100%

**Suggested Actions**:
1. Log cost event to `decisions.log`
2. Notify Aroma immediately (same-hour alert)
3. Suggest throttling options (reduce clip count, lower video quality, defer to next week)

**Sample Configuration**:
```json
{
  "on_cost_alert": {
    "budget_weekly": 50,
    "alert_at_percent": [75, 100],
    "notify_user": true,
    "log_to_decisions": true,
    "suggested_actions": [
      "reduce_clip_count",
      "lower_video_quality",
      "defer_to_next_week"
    ]
  }
}
```

**Example Log Entry**:
```json
{
  "timestamp": "2026-05-10T14:30:00Z",
  "event": "cost_alert",
  "cumulative_cost": 37.50,
  "budget": 50,
  "percent": 75,
  "breakdown": {
    "Claude_API": 15.00,
    "Whisper": 12.50,
    "Storage": 10.00
  },
  "alert": "Cost at 75% of budget. Suggested actions: reduce clip count from 7 to 5, or defer 1 session to next week."
}
```

**When to Add**: Week 2, once token tracking is integrated into skills.

---

### Phase 3: Assignment Evaluation (Implement Week 2)

**Hook Name**: `on_assignment_evaluation_complete`

**Purpose**: Emit assignment outcomes to decision log for ContentReflectSkill

**Trigger**: AssignmentEvaluationSkill completes evaluation of submission batch

**Suggested Actions**:
1. Log pass/fail rates per concept unit
2. Log student names (anonymized) + attempt counts
3. Emit to `decisions.log` + create input for reflect pipeline

**Sample Configuration**:
```json
{
  "on_assignment_evaluation_complete": {
    "log_pass_rate": true,
    "log_attempt_count": true,
    "anonymize_learner_names": true,
    "emit_to_reflect_pipeline": true
  }
}
```

**Example Output**:
```json
{
  "timestamp": "2026-05-12T10:00:00Z",
  "cycle_week": 1,
  "skill": "AssignmentEvaluationSkill",
  "summary": {
    "total_submissions": 25,
    "passed_first_attempt": 20,
    "pass_rate_first_attempt": 0.80,
    "attempt_count_avg": 1.2
  },
  "by_unit": [
    {
      "unit_id": "unit_gradient_descent",
      "submissions": 8,
      "pass_rate": 0.875,
      "avg_time_minutes": 23
    }
  ]
}
```

**When to Add**: Week 2, once assignment evaluation is running.

---

### Phase 4: Rebuild Notifications (Implement Week 4)

**Hook Name**: `on_rebuild_decision`

**Purpose**: Alert course lead if a unit is flagged for rebuild AND teach date is approaching

**Trigger**: ContentReflectSkill decides `rebuild` for a unit

**Suggested Actions**:
1. Create rebuild task in decision log
2. Check if unit's teach date is <7 days away
3. If yes: notify course lead (same-day email)
4. If no: add to backlog for next cycle

**Sample Configuration**:
```json
{
  "on_rebuild_decision": {
    "check_teach_date": true,
    "alert_if_teach_date_within_days": 7,
    "notify_user": true,
    "escalate_to_course_lead": true,
    "create_backlog_task": true
  }
}
```

**Example Log Entry**:
```json
{
  "timestamp": "2026-05-16T18:00:00Z",
  "decision_type": "rebuild",
  "unit_id": "unit_misconception_gradient_descent",
  "reason": "pass_rate_first_attempt: 0.60 (target: 0.80)",
  "teach_date": "2026-05-20",
  "days_until_teach": 4,
  "escalation": "ALERT: Rebuild needed in 4 days. Course lead notified.",
  "backlog_priority": "high"
}
```

**When to Add**: Week 4, once reflect loop is live.

---

### Phase 5: Publishing Notification (Implement Week 3)

**Hook Name**: `on_publish_complete`

**Purpose**: Notify learners when new session materials are live

**Trigger**: LearnerPackPublisherAgent successfully publishes bundle to platform

**Suggested Actions**:
1. Log publish event + asset URLs
2. Notify Aroma (confirmation)
3. Trigger learner notification (TBD: email, SMS, LMS push)

**Sample Configuration**:
```json
{
  "on_publish_complete": {
    "log_publish_event": true,
    "notify_aroma": true,
    "notify_learners": "tbd",
    "emit_publish_urls": true
  }
}
```

**When to Add**: Week 3, once platform publishing is integrated.

---

### Optional: Video Quality Failures (Low Priority)

**Hook Name**: `on_video_quality_gate_failure`

**Purpose**: Log patterns in video QA failures (e.g., "audio quality low on 80% of recordings from Zoom")

**Trigger**: VideoQualityGateAgent flags >50% of a session's clips as `needs_review`

**Suggested Actions**:
1. Log failure pattern
2. Suggest diagnostic (is audio source problem? bad internet? speaker issue?)
3. Create alert for instructor (maybe your setup is wrong?)

**When to Add**: Week 3+, if video processing becomes a recurring issue.

---

## Hook Management Best Practices (Per Anthropic Docs)

### 1. **No Silent Hook Failures**
- Hooks should always log their execution
- If a hook fails, log the failure and notify user
- Example: If `on_context_95_percent` fails to flush logs, emit error and suggest manual archival

### 2. **Hook Atomicity**
- Each hook action should be independent
- If one action fails, others can still run
- Example: If `update_memory_files` fails, still continue to `flush_session_logs`

### 3. **Testability**
- Always have a way to manually trigger a hook for testing
- Example: `/trigger-hook on_gate_transition` command (TBD in CLI)
- Test hooks in non-production environment first

### 4. **Versioning**
- If you change a hook's behavior, document the change
- Update HOOKS_REFERENCE.md
- Example: "Week 2: Added `emit_to_reflect_pipeline` to on_assignment_evaluation_complete"

### 5. **Performance**
- Hooks should be fast (<5 seconds per hook)
- Don't do expensive computations in hooks (e.g., don't re-process all videos)
- If action takes >5 seconds, queue it asynchronously

---

## Testing Hooks (DIY Checklist)

Before each phase, test hooks:

- [ ] **Context 95%**: Read large files until context hits 95%; verify memory flushed
- [ ] **Tool logging**: Run any tool (Bash, Read, Write); verify entry in session.log
- [ ] **Session end**: Close session; verify logs archived + memory index updated
- [ ] **Gate transition** (Week 1): Run orchestrator mock; verify event in decisions.log
- [ ] **Cost alert** (Week 2): Mock cost accumulation; verify alert fires at 75% + 100%
- [ ] **Assignment eval** (Week 2): Run evaluation skill; verify pass rates logged
- [ ] **Rebuild alert** (Week 4): Mark unit for rebuild with teach date <7 days; verify course lead notified
- [ ] **Publish notification** (Week 3): Mock publish event; verify URLs logged + Aroma notified

---

## Hook Configuration Locations

### Global Hooks (User-Level)
**File**: `~/.claude/settings.json`
**Scope**: Applies to all projects on this machine
**Use for**: Global logging preferences, user-wide cost budgets

### Project Hooks (Project-Level) ✅ CURRENT
**File**: `./.claude/settings.json` (inside Content Queen folder)
**Scope**: Only applies to Drawing Room project
**Use for**: Project-specific gates, drawing room cost alerts, memory management

### Local Overrides (Development)
**File**: `./.claude/settings.local.json` (optional)
**Scope**: Overrides project hooks for single user
**Use for**: Testing hook changes without affecting team

---

## Recommended Reading

- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) — Core patterns
- [Claude Code Documentation](https://docs.anthropic.com/claude-code) — Hook API reference
- [Drawing Room Planning](./planning/planning.md) — Gate definitions + SLAs

---

*Hooks reference updated 2026-05-04. Review before each phase implementation.*
