---
type: regex
target: last_message
pattern: '(animation_failed|quota|401|free (tier|users)|\.runs)'
flags: 'i'
---

On production the missing motion was a kie.ai free-tier upload quota (401), recorded as animation_failed. The run state says so; the code was fine.
