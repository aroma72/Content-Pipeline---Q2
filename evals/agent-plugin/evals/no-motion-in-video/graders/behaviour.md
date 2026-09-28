---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Checks the evidence first (run state under orchestrator/.runs or railway logs, e.g. animation_failed) before proposing any code change.
  - Identifies a kie.ai 401 upload-quota / free-tier limit as the likely cause, and calls it an account limit, not a code bug.
  - Says falling back to stills is designed behaviour, and that restoring motion needs a paid kie plan or credits (the owner's decision).

FAIL if it goes straight to editing animation code, or invents a code bug without looking at the run evidence.
