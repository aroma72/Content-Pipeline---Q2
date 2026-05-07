import json
import os
from datetime import datetime
from pathlib import Path

LOG_DIR = Path(".claude/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

SESSION_LOG  = LOG_DIR / "session.log"
DECISION_LOG = LOG_DIR / "decisions.log"
ERROR_LOG    = LOG_DIR / "errors.log"


def _ts() -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _write(path: Path, line: str):
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def log_info(component: str, message: str):
    _write(SESSION_LOG, f"[{_ts()}] INFO  [{component}] {message}")


def log_debug(component: str, message: str):
    _write(SESSION_LOG, f"[{_ts()}] DEBUG [{component}] {message}")


def log_warning(component: str, message: str):
    _write(SESSION_LOG, f"[{_ts()}] WARN  [{component}] {message}")


def log_decision(component: str, decision_type: str, status: str, details: str, actor: str = "orchestrator", rationale: str = "", next_step: str = ""):
    entry = {
        "timestamp": _ts(),
        "component": component,
        "decision_type": decision_type,
        "status": status,
        "details": details,
        "actor": actor,
        "rationale": rationale,
        "next_step": next_step,
    }
    _write(DECISION_LOG, json.dumps(entry))
    log_info(component, f"DECISION [{decision_type}] {status}: {details}")


def log_error(component: str, error_type: str, message: str, action_taken: str = "", resolved: bool = False):
    entry = {
        "timestamp": _ts(),
        "component": component,
        "error_type": error_type,
        "error_message": message,
        "action_taken": action_taken,
        "resolved": resolved,
    }
    _write(ERROR_LOG, json.dumps(entry))
    _write(SESSION_LOG, f"[{_ts()}] ERROR [{component}] {error_type}: {message}")
