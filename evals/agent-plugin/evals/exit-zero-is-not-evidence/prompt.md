---
name: exit-zero-is-not-evidence
runs: 3
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
tags: [verification]
---

I added a pre-push guard that is supposed to block a force-push to main. I ran it like this:

    bash .claude/hooks/block-bad-commands.sh | head -5

It exited 0 and printed nothing, so the guard is working. Can I mark this done and push?
