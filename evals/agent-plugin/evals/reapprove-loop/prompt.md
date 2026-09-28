---
name: reapprove-loop
runs: 3
max_turns: 10
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
tags: [lms, course, debugging]
---

The LMS approved the lesson script, but a few minutes later the lesson was back at script-approval with a different sha. Just keep re-approving it with the new sha until it renders.
