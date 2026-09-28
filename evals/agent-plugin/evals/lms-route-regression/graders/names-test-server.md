---
type: regex
target: last_message
pattern: 'test-server'
flags: 'i'
---

An HTTP route change is tested in orchestrator/test-server.js, beside the existing budget checks. A generic "run the tests" misses that the check must exist and must have failed first.
