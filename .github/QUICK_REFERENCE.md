# Quick Reference — Infrastructure Monitoring

**Print this. Keep it handy.**

---

## Before Every Push

```bash
# 1. Run tests locally
pytest tests/ -v --tb=short

# 2. Validate pipeline
python main.py --dry-run

# 3. Check for hardcoded prompts
grep -r "^SYSTEM_PROMPT = " skills/ agents/ && echo "❌ FAIL" || echo "✅ OK"

# 4. Run smoke test
bash .claude/scripts/smoke-test.sh
```

✅ **All pass?** Push. ❌ **Any fail?** Fix before pushing.

---

## Weekly

- [ ] Check health: `cat .claude/logs/health.json | jq .status`
- [ ] Review logs: `tail -20 .claude/logs/session.log`
- [ ] Run tests: `pytest tests/ -v --cov`

---

## Monthly

- [ ] Scan for hardcoded prompts: `grep -r "^SYSTEM_PROMPT" skills/`
- [ ] Check memory freshness: `ls -la ~/.claude/projects/*/memory/*.md`
- [ ] Review test coverage: `pytest tests/ --cov-report=term-missing`

---

## Monitoring Commands

```bash
# Health status
cat .claude/logs/health.json

# Run health check manually
bash .claude/scripts/infrastructure-check.sh

# Test status
pytest tests/ -v --tb=no

# Prompt audit
grep -r "SYSTEM_PROMPT" skills/ agents/ | wc -l

# Logger status
tail .claude/logs/session.log
```

---

## Emergency

| Issue | Fix |
|-------|-----|
| Tests broken | `pytest tests/ -v --tb=short` then `git diff tests/` |
| Hardcoded prompt found | Extract to `prompts/`, reload skill |
| Logger not writing | `mkdir -p .claude/logs && chmod 755 .claude/logs` |
| Pipeline invalid | Run `python main.py --dry-run` and check output |
| CI/CD fails | Check `.github/workflows/test.yml` syntax |

---

## Setup (One Time)

1. **Pre-commit hook:**
   ```bash
   cp .github/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
   ```

2. **Daily health check (cron):**
   ```bash
   crontab -e
   # Add: 0 6 * * * cd /path && bash .claude/scripts/infrastructure-check.sh >> .claude/logs/health.log 2>&1
   ```

3. **Share with team:** `docs/infrastructure-maintenance.md`

---

## Dashboard

**Current Status:**
```bash
jq '.status' .claude/logs/health.json
```

**Last Check:**
```bash
jq '.check_time' .claude/logs/health.json
```

**Next Check:**
```bash
jq '.next_check' .claude/logs/health.json
```

---

## Files to Know

- **CI/CD**: `.github/workflows/test.yml`
- **Pre-commit**: `.github/hooks/pre-commit`
- **Health check**: `.claude/scripts/infrastructure-check.sh`
- **Health status**: `.claude/logs/health.json`
- **Operations guide**: `docs/infrastructure-maintenance.md`
- **Setup guide**: `.github/SETUP_GUARDRAILS.md`

---

**Everything looks good? That's the point.**  
**Something broken? Follow the emergency table above.**

Last updated: 2026-05-20
