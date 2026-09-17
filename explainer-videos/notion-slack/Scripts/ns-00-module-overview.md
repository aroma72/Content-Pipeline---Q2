# Module 14 — Connect Your Agent to the Places It Works

**Format changed 2026-09-16: no protagonist, no storyline.** These are **technical how-to explainers** —
interface screens, diagrams and terminal output, narrated directly to the person building it. Ali does
not appear. Nothing is illustrated.

Content is taken section by section from `notion-slack-railway-github-guide.md`, the standalone
reference grounded in the team's own ILHAM system (`Documents/Intelligence project/app/`) — so every
step, value name and code shape is real, not hypothetical.

---

## The premise the whole module builds toward

> **You stop opening the project and chatting with it. You ask in Slack. It works in the background.
> It tracks itself in Notion. It comes back to you when it's done or stuck.**

Any agentic system you want genuinely autonomous needs three things a chat window cannot give it:

1. **A place to keep track of what it's doing** — a task board it can read and write
2. **A way to talk to you, in both directions** — you tell it what to do; it tells you what happened
3. **A body that's awake when you are not** — something running whether or not your laptop is open

Notion, Slack, GitHub and your deployment are the four pieces that answer those three needs.

**Deployment is platform-agnostic.** Learners already have something live — Railway, Render, Vercel,
Fly. The module never tells anyone to set up a new host; video 6 is what to add *on top of what you
already run*. Railway appears only as the reference system's example.

---

## The seven videos

| # | Title | Covers | The one move |
|---|-------|--------|--------------|
| 1 | **Why a Chat Window Isn't Enough** | §1 | Name the three things your setup is missing |
| 2 | **The Loop, End to End** | §2 | Trace one request from Slack message to merged PR |
| 3 | **Notion — The Task Board** | §3 | Create it, build the board, **share it under Connections**, copy two values |
| 4 | **Slack — Speak, Then Listen** | §4a + §4b | Scopes → install → `xoxb-` → `/invite` → channel ID, then Event Subscriptions → Request URL → challenge → signing secret |
| 5 | **GitHub — Two Jobs** | §5 | A token to commit with, and a webhook to be woken by |
| 6 | **Your Deployment — The Body** | §6 | Paste the secrets, give Slack and GitHub your address, add the check-in loop |
| 7 | **The Four Mistakes** | §7 | Identify which of four before touching any code |

**Order is build order.** 1–2 give the shape; 3 → 4 → 5 → 6 build it in the order the values are needed
(you cannot set Slack's Request URL before §6 gives you an address — video 4 says so and video 6 pays it
off); 7 is the troubleshooting pass you come back to.

---

## What this format means in practice

**Visually:** every beat is one of three things — a **real interface screen** (`ui`), an **HTML card or
diagram** (`info`), or a **full-screen title/signpost** (`card`). No characters, no shop, no scenes.

**Practically, it is cheaper and faster than the illustrated format:**

| | Illustrated (old) | Technical how-to (this) |
|---|---|---|
| Imagen art | ~15 images/video | **none** |
| Cutout segmentation | required | **none** |
| kie i2v clips | 3/video, paid | **none** |
| Cost per video | ~$0.60 art + $0.90 motion | **voiceover only, pennies** |
| Gates | qa-visuals character rules | `qa-info` + `qa-checkpoint` only |

`qa-visuals` detects the absence of character art and skips its character rules automatically — it does
not need to be told which format a video is.

**The interfaces are shown exactly.** Videos 3–6 each carry a screen-by-screen capture list: what must be
visible, and what must never be (real tokens, workspace names, colleagues, customer data). Two production
routes — faithful HTML re-creations in `animation/walkthrough.html`, or real captures with a scrub pass.
Re-creation is recommended: proofread-able, re-renders when a vendor moves a button, and cannot leak.

---

## The question, in every video (settled — enforced, not remembered)

Each video **pauses** at one checkpoint. The LMS shows a multiple-choice question. **The learner must
click an option to continue** — no skip, no dismiss, no seeking past it. A wrong answer gets feedback
that explains the mistake; a right one gets confirmation of *why*. Then playback resumes.

Nothing about the question is drawn or spoken, so it is invisible in the MP4 — which is why
`qa-checkpoint.js` fails any build whose checkpoint is missing, drawn, spoken, first/last,
un-answerable, or whose wrong-answer feedback is under 120 characters or a single sentence.
`scripts/publish-checkpoint.js` then sends the timing and the question to Railway and **verifies it live**
before reporting success, so the LMS developer can wire it up.

---

## What this supersedes

`Scripts/_superseded/` holds the original eight scripts (the "Ali connects two tools" framing) and the
first rewrite (same content, Ali retained). Three built assets are now out of date and would need
rebuilding to match: the module intro, *Locked Out of the Room*, and the assessment guide — all three
illustrated, all three story-led. Their checkpoints are live on Railway and would need republishing.
