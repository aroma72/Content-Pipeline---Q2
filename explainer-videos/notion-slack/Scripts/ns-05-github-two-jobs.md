# Video 5 — GitHub's Two Jobs — draft

**Format: technical how-to walkthrough.** No protagonist. Real GitHub screens, `card` + `ui` beats.
**Covers:** guide §5, both jobs
**Teaches:** GitHub is not "another app to connect" — it does two separate things. It is the agent's
**workshop** (a token lets it commit and open pull requests), and it is a **trigger** (a webhook wakes
the agent the moment something happens, instead of it waiting for the clock).
**One move:** make a fine-grained token scoped to one repo, then add a webhook with a matching secret.
**Spine:** the agent opens a pull request, and later reacts to a repo event within seconds.

Keeping the two jobs separate is the whole point of the video — blurred together, "connect GitHub"
sounds like one more API key, and the trigger half never gets built.

## Script (one beat per line · [card] = full-screen card · [ui] = interface screen · [info] = spoken point on a card)

1.  [card] GitHub does two jobs. Most people build one and miss the other. *(title card)*
2. [info] Job one is the workshop. Job two is the doorbell.
3.  [card] Job one — the workshop. *(signpost)*
4.  [ui]   The agent's code lives in a repo, and it needs to commit like a person does. *(G1)*
5.  [ui]   Settings, Developer settings, Personal access tokens, Fine-grained. *(G2)*
6.  [ui]   Scope it to the one repository. Not all of them. *(G3)*
7.  [ui]   Grant Contents, read and write. That is what lets it commit. *(G4)*
8. [info] Fine-grained and one repo, so a leaked token cannot reach anything else.
9.  [ui]   Copy the token. This is the credential that makes it a committer, not a reader. *(G5)*
10. [ui]   Now it can push commits and open pull requests on its own. *(G6 — a PR by the agent)*
11. [info] A pull request is the agent proposing. You still decide.
12. [card] Job two — the doorbell. *(signpost)*
13. [info] So far it only acts when you message it, or when the clock says so.
14. [ui]   A webhook adds a third trigger: something happened in the repo. *(G7)*
15. [ui]   Repo, Settings, Webhooks, Add webhook. *(G8)*
16. [ui]   Payload URL is your deployed app's address plus the endpoint. *(G9)*
17. [ui]   Content type, application slash json. *(G10)*
18. [ui]   Secret: any string — and set the exact same string on your server. *(G11)*
19. [checkpoint] *(nothing on screen — the player pauses, the LMS asks, gives feedback, resumes)*
20. [ui]   Pick the events to fire on. *(G12)*
21. [info] The real system listens for repository invitations, so it can accept being added to a repo on its own.
22. [ui]   Your server checks the signature the same way it did for Slack. *(G13 — the HMAC check)*
23. [info] A webhook is just someone else's server calling yours.
24. [info] And the secret is how you prove it is really them.
25. [card] Two jobs, two credentials: a token to act, a secret to be trusted. *(checklist)*
26. [info] Your turn. Make the token, add the webhook, and set the secret in both places.

## The checkpoint (beat 19)

**Stem.** You added the webhook with a secret, deployed your server, and pushed an event — but the
server rejects every delivery with a 403. What is almost certainly wrong?

**Options.**
- A — The payload URL is wrong
- B — The secret in GitHub and the secret on your server do not match
- C — The token needs Contents write permission
- D — GitHub has not verified the webhook yet

**Answer.** B.

**If they get it right.** Right — and the reason this one is nasty is that both halves look correct in
isolation. GitHub shows a secret is set; your server has a secret set. Neither dashboard can tell you
they are different strings, so the only symptom is a signature that never matches.

**If they get it wrong.** The two secrets do not match. The signature check recomputes the HMAC from the
secret on your server and compares it to the header GitHub sent — if the strings differ by even one
character, or the environment variable was never actually set on the host, every delivery fails the
comparison and returns 403. A wrong payload URL gives no delivery at all, not a rejected one; the token's
Contents permission governs *committing*, which has nothing to do with inbound verification; and GitHub
does not hold webhooks back for verification the way Slack does. When a webhook 403s, check that the env
var is really set on the server and really matches what is typed into the dashboard.

## Screens to capture or re-create

| ID | Screen | Must be visible | Must NOT be visible |
|----|--------|-----------------|---------------------|
| G1 | The agent's repo, files list | An ordinary repo | Real code, real repo names |
| G2 | Settings → Developer settings → **Fine-grained tokens** | The Generate new token button | Existing tokens |
| G3 | Repository access | **Only select repositories**, one repo chosen | Real repo names |
| G4 | Permissions | **Contents: Read and write** | Other permissions toggled on |
| G5 | The generated token | `github_pat_` prefix then dots, the Copy control | Any real token characters |
| G6 | A pull request opened by the agent | PR title, author = the agent, the Files changed tab | Real code |
| G7 | Repo → Settings → **Webhooks** | The Add webhook button, an empty list | — |
| G8 | Add webhook form, empty | Payload URL, Content type, Secret, event selector | — |
| G9 | Payload URL filled | An invented app URL ending `/webhooks/github` | A real deployment URL |
| G10 | Content type | `application/json` selected | — |
| G11 | Secret filled, and the same value on the host | Masked in both places, side by side | Any real secret |
| G12 | Event selector | `repository_invitation` ticked | — |
| G13 | Editor: the signature check | HMAC-SHA256 over the body, `compare_digest`, 403 on mismatch | — |

**Production:** re-create in `animation/walkthrough.html` (recommended) or capture with a scrub pass.

## Gate check

**READY** · 26 beats · 13 [ui] · 4 [card] · 8 [info] · 1 [checkpoint] · ~2:30

- **The two jobs stay separate** — signposted at 3 and 12, and restated as two credentials at 25. That
  separation is the teaching, not a structural nicety.
- **Checkpoint:** beat 19, between two spoken beats (18 → 20), 4 options, both halves authored. The
  wrong-answer feedback distinguishes a mismatched secret from a wrong URL and from a permissions problem
  — the three things people try in the wrong order.
- **The repeated pattern lands** at 22–24: the same signature check as Slack, named as one idea rather
  than a new trick per vendor. This is the line worth remembering from the whole module.
- **Covers §5 completely:** fine-grained token scoped to one repo with Contents read/write (5–9), commits
  and PRs (10–11), the webhook with payload URL, content type and secret (14–18), events including
  `repository_invitation` (20–21), the verification code shape (22).

## Build notes

- **No Imagen art, no i2v.** Cursor travel, click pulses, typed text, toggles.
- **Step counter** (`3 / 7`), advancing on 5, 7, 9, 15, 16, 18, 20.
- **Beat 11 is the hinge sentence** of the module's safety story — "the agent proposes, you decide".
  Hold it; the assessment quotes it.
- Beat 18 and screen G11 must show the secret in **both places at once** — that side-by-side is what
  makes the checkpoint's answer obvious in hindsight.
- Beat 22 reuses the exact visual treatment of video 4's HMAC beat, so the repetition is seen, not just
  said.
- The spoken-point beats are plain typographic cards — one sentence, set large, no illustration.
