---
type: reference
last_verified: 2026-10-13
owner: aroma
---

# The question for c1w3-listen-then-ask

This question is **not in the video**. The LMS pauses the video at the point below, shows it as a
pop-up, the learner must pick an answer to continue, sees the feedback, and the video resumes.
The LMS developer reads it from `checkpoint.json` in the repo. To change anything here, tell Claude:
the edit goes into the checkpoint in beats.js and both files are regenerated.

## Question 1 — pauses at 1:35 of the final video

*After the line in beat 14; resumes on beat 16.*

**A content designer is leaving after two years. In the exit interview, which question will teach you the most?**

A. You're leaving for a better salary, right?
B. What made you start looking?  ✅ *correct*
C. Why didn't you raise this with us earlier?
D. The team was supportive though, wasn't it?

**If they choose the right answer, they see:**

> Exactly. It is open, so they choose what matters, and it carries no assumption, so you hear the real reason instead of the one you expected.

**If they choose a wrong answer, they see:**

> "What made you start looking?" is open, so the person decides what matters and you hear the real reason. "You're leaving for a better salary, right?" and "The team was supportive, wasn't it?" are leading questions: they hand over the answer you expect, so you mostly get a polite yes and learn nothing. "Why didn't you raise this earlier?" sounds like blame, so people get defensive and say less. If you need the why, ask "what led you to…" instead.
