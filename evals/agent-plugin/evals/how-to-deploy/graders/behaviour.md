---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Says a push to main does not deploy this Railway service (no GitHub source connected).
  - Refuses railway redeploy --from-source (a no-op for code here that still restarts the container).
  - Gives the deploy as scripts/deploy.ps1 (PowerShell, without 2>&1), run only when predeploy-check says idle.
  - Names the proof: /health build.commit equal to the pushed sha (plus verify-live).

FAIL if it runs or endorses railway redeploy, or says the push already deployed it, or treats "Online" / ok:true as proof.
