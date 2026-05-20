---
type: operations
last_verified: 2026-05-20
owner: Aroma Tahir
---

# Infrastructure Maintenance & Guardrails

**Purpose:** Keep the Drawing Room's testing, logging, and prompt infrastructure operational and prevent regression.

---

## Automated Safeguards (Running Now)

### GitHub Actions CI/CD
**File:** `.github/workflows/test.yml`

**What runs on every push/PR:**
- ✅ Lint: No hardcoded SYSTEM_PROMPT
- ✅ Lint: pytest in requirements.txt
- ✅ Test: `pytest tests/test_signal_intake.py -v`
- ✅ Coverage: `pytest tests/ --cov=skills --cov=agents`
- ✅ Validate: `main.py --dry-run` (6-stage pipeline)
- ✅ Check: Logger directory exists
- ✅ Check: Eval dataset exists

**Status:** Blocks merge if any check fails.

### Pre-commit Hooks
**File:** `.github/hooks/pre-commit`

**What blocks commits locally:**
- Hardcoded SYSTEM_PROMPT found
- prompts/ directory deleted
- Test files deleted
- Secrets in diff
- pytest removed from requirements.txt
- .claude/logs directory deleted

**Install:**
```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Status:** Prevents mistakes before they reach GitHub.

### Daily Health Check
**File:** `.claude/scripts/infrastructure-check.sh`

**Checks every 24 hours (if scheduled via cron):**
1. prompts/ directory exists & not empty
2. No hardcoded prompts found
3. Skills load prompts correctly
4. Logger writing to session.log
5. Eval dataset exists
6. Test files exist
7. Unit test smoke passes
8. Pipeline structure valid
9. pytest in requirements.txt
10. Memory system operational

**Output:** `.claude/logs/health.json`

**Run manually:**
```bash
bash .claude/scripts/infrastructure-check.sh
```

**Schedule (cron):**
```bash
0 6 * * * cd /path/to/Content\ Queen && bash .claude/scripts/infrastructure-check.sh >> .claude/logs/health.log 2>&1
```

---

## Weekly Maintenance (Team Responsibility)

### Before Pushing Code
```bash
# 1. Run tests locally
pytest tests/ -v --tb=short

# 2. Validate pipeline
python main.py --dry-run

# 3. Verify no hardcoded prompts
grep -r "^SYSTEM_PROMPT = " skills/ agents/ && echo "FAIL: Found hardcoded prompts" || echo "OK"

# 4. Check for logs directory
ls -la .claude/logs/

# 5. Run smoke test
bash .claude/scripts/smoke-test.sh
```

### Code Review Checklist
When reviewing PRs, check:
- [ ] No hardcoded SYSTEM_PROMPT
- [ ] Tests pass (GitHub Actions green)
- [ ] Coverage doesn't decrease
- [ ] No deletions in prompts/ or tests/
- [ ] .beads/ status updated if task-related
- [ ] If touching skills: test file updated or created

### Monthly Audit
- [ ] Review `.claude/logs/health.json` — any failures?
- [ ] Check memory files are <60 days old (run `ls -la` on memory dir)
- [ ] Verify CI/CD still running (GitHub Actions page)
- [ ] Scan for TODO comments in code
- [ ] Review `.beads/failures.jsonl` for patterns

---

## When Adding New Functionality

### Adding a Skill
1. **Create prompt file** (not hardcoded):
   ```bash
   cat > prompts/{skill_name}.txt << 'EOF'
   You are {SkillName} — description...
   EOF
   ```

2. **Update skill to load prompt:**
   ```python
   from config import PROMPTS_DIR
   
   def _load_prompt(name: str) -> str:
       prompt_file = PROMPTS_DIR / f"{name}.txt"
       return prompt_file.read_text(encoding="utf-8")
   
   class MySkill:
       def call(self, input):
           system_prompt = _load_prompt("my_skill_name")
           response = self.client.messages.create(system=system_prompt, ...)
   ```

3. **Create test file** using `test_signal_intake.py` as template:
   ```bash
   cp tests/test_signal_intake.py tests/test_{skill_name}.py
   # Edit to match new skill
   ```

4. **Add eval data:**
   ```bash
   mkdir -p tests/eval_dataset/sample_sessions/session_4
   echo '{"signals": [...]}' > tests/eval_dataset/sample_sessions/session_4/signals.json
   ```

5. **Run tests before committing:**
   ```bash
   pytest tests/test_{skill_name}.py -v
   ```

### Adding a Feature
- [ ] Tests must pass before merge
- [ ] No hardcoded prompts
- [ ] Coverage must not decrease
- [ ] Update memory if architecture changes
- [ ] Run pre-push smoke test

---

## Monitoring Health

### Daily Check
```bash
cat .claude/logs/health.json | jq .status
# Output: "healthy" or "unhealthy"
```

### Recent Logs
```bash
tail -20 .claude/logs/session.log
tail -10 .claude/logs/errors.log
```

### Test Status
```bash
pytest tests/ -v --tb=no | tail -5
```

### Memory Freshness
```bash
find ~/.claude/projects/*/memory -name "*.md" -mtime +60 -exec ls -la {} \;
# Shows any memories older than 60 days
```

---

## Troubleshooting

### Tests Failing
**Symptom:** `pytest tests/ -v` shows failures

**Fix:**
1. Run locally: `pytest tests/ -v --tb=short`
2. Check if eval dataset is missing: `ls tests/eval_dataset/`
3. Check if pytest is installed: `pip install -r requirements.txt`
4. Verify logger directory: `mkdir -p .claude/logs`

### Hardcoded Prompt Detected
**Symptom:** Pre-commit or CI/CD blocks merge with "hardcoded SYSTEM_PROMPT"

**Fix:**
1. Extract to `prompts/{skill_name}.txt`
2. Update skill to load using `_load_prompt("{skill_name}")`
3. Commit and re-push

### Logger Not Writing
**Symptom:** `.claude/logs/session.log` not updating

**Fix:**
1. Verify directory exists: `mkdir -p .claude/logs`
2. Check permissions: `chmod 755 .claude/logs`
3. Verify logger.py: `python -c "from logger import log_info; log_info('test', 'hello')"`

### Pipeline Validation Fails
**Symptom:** `main.py --dry-run` doesn't show "PERCEIVE"

**Fix:**
1. Check main.py syntax: `python -m py_compile main.py`
2. Run with full output: `python main.py --dry-run 2>&1`
3. Verify orchestrator.py exists and imports

---

## Emergency Procedures

### If CI/CD Is Down
1. Check GitHub Actions status page
2. Review `.github/workflows/test.yml` for syntax errors
3. Run locally: `pytest tests/ -v`
4. If blocking merge: temporary skip tests (with team lead approval only)

### If Tests Are Broken
1. Run locally to reproduce: `pytest tests/ -v --tb=short`
2. Check eval dataset: `find tests/eval_dataset -type f | wc -l`
3. Restore from git: `git checkout tests/eval_dataset`
4. If still broken: review recent commits to tests/ or conftest.py

### If Memory System Breaks
1. Check memory directory exists: `ls ~/.claude/projects/*/memory/`
2. Verify MEMORY.md is readable: `cat ~/.claude/projects/*/memory/MEMORY.md`
3. If corrupted: restore from git: `git checkout memory/`

---

## Success Metrics

✅ **Infrastructure is healthy if:**
- CI/CD passes on all PRs
- Tests run in <5 minutes
- Daily health check passes
- No hardcoded prompts in production code
- Logger writing >1 entry/day
- All 4 prompts versioned in `prompts/`
- All memories <90 days old
- 90%+ test coverage on skills/agents

---

## Escalation Path

| Issue | Action | Owner |
|-------|--------|-------|
| Single test fails | Run locally, fix, re-push | Developer |
| Multiple tests fail | Review recent changes, revert if needed | Team |
| CI/CD down >1 hour | Check GitHub status, review workflow | DevOps/Lead |
| Memory corruption | Restore from git, rebuild | Aroma |
| Hardcoded prompt in prod | Hotfix, extract, re-test | Developer + Lead |

---

*Last updated: 2026-05-20*  
*See also:* `CONTEXT_LOSS_AUDIT_FIXES.md` for background on why this infrastructure exists.
