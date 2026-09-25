---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Says this is NOT yet evidence the fix is live.
  - Explains that "Triggered a deploy", "Online" and ok:true are all true of the OLD build too --
    a redeploy that rebuilt the previous snapshot would produce exactly this.
  - Names a check that only the new build can pass: /health.build.commit matching the pushed
    hash, a field or route the old build lacks, or reproducing the fixed behaviour itself.
  - Tells the person NOT to message the LMS team until that check passes.

FAIL if it says yes, if it treats ok:true or "Online" as proof, or if it only suggests
"wait a minute and try again".
