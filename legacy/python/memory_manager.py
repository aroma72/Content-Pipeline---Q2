"""
Agent Memory Manager — Enforces locked rules and tracks past mistakes across agents.

All agents must inject these rules at the TOP of their system prompts/instructions before
executing any logic. LOCKED rules override all other instructions and cannot be violated.
"""

import json
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime


class AgentMemoryManager:
    """Load and format agent behavioral rules and past mistakes."""

    def __init__(self, memory_file: str = "agent_memory.json"):
        self.memory_file = Path(memory_file)
        self._memory_data: Optional[Dict[str, Any]] = None

    @property
    def memory_data(self) -> Dict[str, Any]:
        """Lazy-load memory file."""
        if self._memory_data is None:
            if not self.memory_file.exists():
                raise FileNotFoundError(f"agent_memory.json not found at {self.memory_file}")
            with open(self.memory_file, 'r') as f:
                self._memory_data = json.load(f)
        return self._memory_data

    def get_global_rules(self) -> List[Dict[str, Any]]:
        """Fetch all global rules that apply to all agents."""
        return self.memory_data.get("global_rules", [])

    def get_agent_specific_rules(self, agent_name: str) -> List[Dict[str, Any]]:
        """Fetch rules specific to a single agent."""
        agent_rules = self.memory_data.get("agent_specific_rules", {})
        return agent_rules.get(agent_name, [])

    def get_past_mistakes(self, agent_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch last N past mistakes for an agent (prevents repeated errors)."""
        past_mistakes = self.memory_data.get("past_mistakes", {})
        agent_mistakes = past_mistakes.get(agent_name, [])
        return agent_mistakes[-limit:]  # Last N mistakes only

    def format_locked_rules_preamble(self, agent_name: str) -> str:
        """
        Generate the LOCKED RULES preamble to be injected at the TOP of agent instructions.
        This must appear before any other instructions or reasoning.

        Format:
        ====================== LOCKED RULES ======================
        [Critical rules that override everything]

        AGENT-SPECIFIC RULES:
        [Rules just for this agent]

        PAST MISTAKES — DO NOT REPEAT:
        [Last 5 mistakes this agent made]
        ============================================================

        Returns the formatted preamble as a string.
        """

        global_rules = self.get_global_rules()
        agent_rules = self.get_agent_specific_rules(agent_name)
        past_mistakes = self.get_past_mistakes(agent_name, limit=5)

        preamble = []
        preamble.append("=" * 70)
        preamble.append("LOCKED RULES — THESE OVERRIDE EVERYTHING, ALWAYS FOLLOW THEM")
        preamble.append("=" * 70)
        preamble.append("")

        # Global rules
        preamble.append("GLOBAL RULES (apply to all agents):")
        preamble.append("")
        for rule in global_rules:
            if rule.get("severity") == "CRITICAL":
                preamble.append(f"🔴 CRITICAL [{rule['rule_id']}]: {rule['rule']}")
                preamble.append(f"   ├─ If violated: {rule['violated_by']}")
                preamble.append(f"   └─ How to follow: {rule['how_to_follow']}")
                preamble.append("")

        # Agent-specific rules
        if agent_rules:
            preamble.append("")
            preamble.append("AGENT-SPECIFIC RULES:")
            preamble.append("")
            for rule in agent_rules:
                severity_emoji = "🔴" if rule.get("severity") == "CRITICAL" else "🟡"
                preamble.append(f"{severity_emoji} [{rule['rule_id']}]: {rule['rule']}")
                preamble.append(f"   ├─ If violated: {rule['violated_by']}")
                preamble.append(f"   └─ How to follow: {rule['how_to_follow']}")
                preamble.append("")

        # Past mistakes
        if past_mistakes:
            preamble.append("")
            preamble.append("PAST MISTAKES — DO NOT REPEAT THESE:")
            preamble.append("")
            for i, mistake in enumerate(past_mistakes, 1):
                preamble.append(f"{i}. {mistake['mistake_id']} (reported {mistake['timestamp']})")
                preamble.append(f"   Error: {mistake['error']}")
                preamble.append(f"   Root cause: {mistake['root_cause']}")
                preamble.append(f"   Fix applied: {mistake['fix_applied']}")
                preamble.append(f"   Prevention: {mistake['prevent_next_time']}")
                preamble.append("")

        preamble.append("=" * 70)
        preamble.append("END LOCKED RULES — You must comply with all rules above.")
        preamble.append("=" * 70)
        preamble.append("")

        return "\n".join(preamble)

    def log_new_mistake(self, agent_name: str, mistake_data: Dict[str, str]) -> None:
        """
        Log a new mistake so it appears in future LOCKED RULES for this agent.

        Args:
            agent_name: RemotionVideoAgent, PostProductionAgent, etc.
            mistake_data: {
                mistake_id: str,
                error: str (what went wrong),
                root_cause: str (why it happened),
                fix_applied: str (what was changed),
                prevent_next_time: str (how to avoid it)
            }
        """
        if not self.memory_file.exists():
            raise FileNotFoundError("agent_memory.json not found")

        # Add timestamp
        mistake_data["timestamp"] = datetime.now().strftime("%Y-%m-%d")

        # Load, update, save
        data = self.memory_data
        if "past_mistakes" not in data:
            data["past_mistakes"] = {}
        if agent_name not in data["past_mistakes"]:
            data["past_mistakes"][agent_name] = []

        data["past_mistakes"][agent_name].append(mistake_data)
        data["last_updated"] = datetime.now().isoformat()

        with open(self.memory_file, 'w') as f:
            json.dump(data, f, indent=2)

        # Reset cached data so next load gets updated content
        self._memory_data = None


def inject_locked_rules(agent_name: str, manager: AgentMemoryManager = None) -> str:
    """
    Convenience function: Get LOCKED RULES preamble for an agent.

    Usage in agent code:
        locked_rules = inject_locked_rules("RemotionVideoAgent")
        system_prompt = locked_rules + "\n\nNow proceed with the task..."
    """
    if manager is None:
        manager = AgentMemoryManager()

    return manager.format_locked_rules_preamble(agent_name)


if __name__ == "__main__":
    # Test: Print locked rules for each agent
    manager = AgentMemoryManager()

    print("\n" + "=" * 80)
    print("REMOTION VIDEO AGENT - LOCKED RULES")
    print("=" * 80)
    print(manager.format_locked_rules_preamble("RemotionVideoAgent"))

    print("\n" + "=" * 80)
    print("POST PRODUCTION AGENT - LOCKED RULES")
    print("=" * 80)
    print(manager.format_locked_rules_preamble("PostProductionAgent"))

    print("\n" + "=" * 80)
    print("DISTRIBUTION AGENT - LOCKED RULES")
    print("=" * 80)
    print(manager.format_locked_rules_preamble("DistributionAgent"))
