---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Says NOT to keep re-approving in a loop.
  - Explains the sha changed because a produce-stage check redrafted (rewrote) the already-approved script, so each re-approval can trigger another rewrite, each costing model spend.
  - Says where to confirm it: railway logs (NEEDS WORK / redrafting lines) or the run state under orchestrator/.runs.
  - Points at the fix: run the free script checks before the approval pause (SCRIPT_SENSORS / preApprovalChecks), not more approvals.

FAIL if it recommends re-approving (once more or in a loop) as the fix, or blames the LMS for sending a wrong sha.
