---
type: regex
target: last_message
pattern: 'deploy\.(ps1|sh)'
flags: 'i'
---

The only thing that deploys this service is scripts/deploy.ps1 (deploy.sh). A push does not, and redeploy --from-source does not either.
