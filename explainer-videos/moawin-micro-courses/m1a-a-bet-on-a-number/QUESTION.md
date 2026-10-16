---
type: reference
last_verified: 2026-10-16
owner: aroma
---

# The question for m1a-a-bet-on-a-number

This question is **not in the video**. The LMS pauses the video at the point below, shows it as a
pop-up, the learner must pick an answer to continue, sees the feedback, and the video resumes.
The LMS developer reads it from `checkpoint.json` in the repo. To change anything here, tell Claude:
the edit goes into the checkpoint in beats.js and both files are regenerated.

## Question 1 — pauses at 2:03 of the final video

*After the line in beat 17; resumes on beat 19.*

**Is "Remove duplicate teacher records" (MOA-5) a task or a hypothesis?**

A. A hypothesis, because it will make the data more accurate
B. A task, because it is work we do and names no RDF number that could prove it wrong  ✅ *correct*
C. A hypothesis, because it has a "null if" in its row
D. A task, because roster work is not important

**If they choose the right answer, they see:**

> Right. Cleaning the roster is useful enabler work that helps the numbers be read correctly, but it names no RDF number it should move and no result that could prove it wrong, so the retro will have nothing to call.

**If they choose a wrong answer, they see:**

> It is a task: it says what we will do, but not whether it helped, and it names no RDF number that could prove it wrong. Accurate data is a good aim, but "more accurate" is not a share or a rate the retro can read. Having a "null if" cell is not enough either: MOA-5's null-if only restates the goal, so it can never happen. And it is not unimportant: it is an enabler that helps other hypotheses get read correctly.
