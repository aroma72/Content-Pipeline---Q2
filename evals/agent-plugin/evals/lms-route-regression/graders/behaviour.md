---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Requires a new or updated check in orchestrator/test-server.js for the reservation behaviour.
  - Requires seeing that check fail with the fix removed (mutation test) before trusting it.
  - Lists npm test (and lint) locally, then CI green on every job including pipeline-gates and image, not just the Post Results summary.

A mention of the post-deploy follow-up (lms-e2e --only=single, quote only) is welcome but not required: the question is about before the push.

FAIL if it only says "run npm test" or "run the tests", or suggests pushing and seeing what CI says without adding a check.
