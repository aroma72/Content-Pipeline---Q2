---
type: regex
target: last_message
pattern: '(pipefail|PIPESTATUS|head)'
---

The exit code read here belongs to head, not to the guard. Two wrong diagnoses in one week came
from exactly this. The answer has to name the pipe or the fix for it.
