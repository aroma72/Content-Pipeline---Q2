---
type: regex
target: last_message
pattern: '(build\.commit|commit|version|a field (that )?only the new build|deployment list)'
flags: 'i'
---

Three "successful" redeploys here changed nothing, and /health said ok:true through all of them.
The only proof is something the NEW build alone can answer -- its commit stamp, or a field the
old build did not have. The answer must ask for that, by name.
