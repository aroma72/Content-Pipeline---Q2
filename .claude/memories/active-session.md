# Active Session

The HOT tier. Current work and what the next session must pick up — nothing that would still be
true in three months (that belongs in a warm file; see `.claude/standards/MEMORY_TIERS.md` §1).

Kept under `DR_ACTIVE_SESSION_BUDGET` lines (default 300) by `rotate-active-session.sh`, which
moves whole dated `## YYYY-MM-DD` sections out to `session-archive/` at session end. The dated
heading is load-bearing structure — rotation matches on it and refuses to act without it.

No frontmatter: this file is machine-managed and exempt from the metadata contract.

---

## NEXT_STEPS

- Token rotation, then §7 held video. References stage built but never run with a real API key.
- Skill system rebuilt 2026-09-23. `node evals/skills/run.js` must stay green; if a `beats.js`
  legitimately changes, delete `evals/skills/baseline.json`, re-run, and commit the new snapshot
  in the SAME commit as the change. Paid `claude plugin eval` layer is specced but not built.

---

<!-- 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-22, 2026-09-22, 2026-09-22, 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-23, 2026-09-23, 2026-09-23, 2026-09-22 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-24, 2026-09-23 rotated to .claude/memories/session-archive/ -->

<!-- 2026-09-25, 2026-09-25, 2026-09-25, 2026-09-24, 2026-09-24 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-28, 2026-09-28, 2026-09-27 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-25, 2026-09-25 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-28 rotated to .claude/memories/session-archive/ -->
## 2026-10-05

- NEW: P&C people-skills curriculum requested by the head of P&C (for P&C Buddies, who own the
  employee journey from candidate to alumni). Proposed TWO 4-week courses: (1) Understanding &
  Listening to People — philosophy/journey, human behaviour, active listening, questioning,
  empathy with objectivity; (2) Handling the Hard Moments — difficult conversations, grievances,
  conflict resolution, capstone. Each week mirrors their I do / we do / you do method
  (video = I do, live role-play with P&C leads = we do, real-case assignment = you do).
- Next session: wait for Aroma's approval of the split + the open questions (team size and
  experience, hours per week, the grievance policy doc, who runs "we do"). After that: script PDFs
  only, then stop for review before any spend.
- Aroma changed the format to ONE video per week, so 8 videos across the 2 courses. Titles and
  learning goals were given inline in chat; Ali is the P&C Buddy throughout.
- Aroma dropped the Ali storyline for the P&C courses ONLY. These videos speak to the viewer as
  "you" (a P&C Buddy) and say what you should do. This is a deliberate exception to the Ali rule,
  so expect the script gatekeeper and the Ali gates to flag it.
- Built Course 1, Week 1 ("Your Role as a P&C Buddy") in LearnFree style, using GCF LearnFree "Hard
  Skills vs Soft Skills" as the reference. Folder: `explainer-videos/pc-people-skills/c1w1-your-role/`.
  It has 23 beats; every visual is HTML motion graphics (new `animation/info-lf.{js,css}` +
  `lesson-lf.html`, bundled Roboto Slab and Zilla Slab fonts). No art spend. The local
  `qa-info.js` contract now includes the lf* templates. The free gates pass (checkpoint, info,
  visuals, frames with LESSON_HTML=animation/lesson-lf.html). The review PDF is at
  `pc-people-skills/pdf/c1w1-your-role-script.pdf`.
- WAITING on Aroma: approval of the script and look, then TTS ($0.04 quote) → compile with
  LESSON_HTML=animation/lesson-lf.html → stitch-brand → verify.
- DONE: c1w1 final video at `explainer-videos/pc-people-skills/c1w1-your-role/out/c1w1-your-role_final.mp4`
  (131.8s). verify PASS, eval-text PASS, qa-frames PASS. Spend: TTS of about $0.04 plus a few eval-text calls.
  Aroma's repeated "is it done" was taken as the go. The compile ran longer than the 600s
  foreground limit, so run it in the background. Not yet done: TU Drive offload (§4a) and
  the QA rating entry.

## 2026-10-06

- Aroma reviewed c1w1 v1 and asked for changes. v2 is built: `pc-people-skills/c1w1-your-role/out/c1w1-your-role_final.mp4`
  (126.4s, verify PASS). Changes: text spacing and alignment, warm topic music (`make-music-people.js`,
  MUSIC_FILE=music/people-warm.wav), Sulafat voice with per-beat `tone`, the red highlight boxes
  replaced by a mustard marker stripe, warm skin and no blue on people, and the quiz taken OUT of the video.
- GUARDRAIL now in the template qa-checkpoint.js: it fails on a quiz card, a quiz on a drawn beat,
  or revealsQuiz. New export-checkpoint.js writes checkpoint.json; scaffold copies it. SKILL.md is fixed.
- Bug fixed (template + folder): tts-lesson cache keyed on text only, so a voice change reused old clips.
- eval-text could not run: Google says "API key not valid", although TTS worked an hour earlier with
  the same key. Aroma should check or rotate GOOGLE_STUDIO_API_KEY.
- Committed in a clean worktree off origin/main (the shared branch lms-creation-api-hardening has 4
  unpushed daily-sync commits and its PR #1 is closed). Branch: pc-people-skills-c1w1; PR opened
  for the LMS dev. NOT deployed to Railway. Worktree lives in the session scratchpad; remove it
  after merge.
- Pending: Aroma's review of v2, merge and deploy, TU Drive offload, QA rating.
- MUSIC v3 (Aroma: "too loud, obviously loops, School of Life style"). Cause: make-music-people.js
  was a one-bar pattern repeated, mixed at -21 dB against the VO's -19.7 dB, so it was as loud as
  the voice. stitch-brand.js mixes the music file at its own level. New make-music-sol.js:
  through-composed piano and strings (seeded chord walk, varied chord lengths, humanised figures),
  -33 dBFS RMS, about -42 dB under the intro. The first take had real dropouts (-97 dB between
  chords in the solo-piano opening); fixed with a slower piano decay, a soft string bed from the
  start, and figures spread across each chord. Only the music changed; out/lesson.mp4 was reused.
- PR #2 is open: https://github.com/aroma72/Content-Pipeline---Q2/pull/2 (branch pc-people-skills-c1w1,
  worktree at C:/Users/Aroma Tahir/wtpc, which has a node_modules junction; unlink the junction before
  removing the worktree). Not merged or deployed.
- Lesson: a worktree under the scratchpad path breaks smoke-test's py_compile (Windows path length).
  Put worktrees at a short path.
- Music at -33 dBFS was INAUDIBLE: sidechain ducking took the bed to -41.8 dB, 22 dB under the VO.
  Re-set to -26 dBFS, giving a ducked bed of -34.8 dB, 15 dB under the VO; generator default updated.
  Rule: calibrate on the ducked bed (filter graph replicating stitch-brand), never the raw file.
  The -26 default is committed and pushed to PR #2.
- Aroma: "again really bad music choice, search the web for the music that fits such videos;
  the level is fine." Root cause: synthesized sine music cannot sound like real instruments,
  however well it is composed. Switching to a REAL recorded CC0 track: the FreePD archive on
  archive.org (CC0). Prefer FreePD's own category folders (upbeat/, romantic/, misc/, world/) and
  Monplaisir (CC0). Page2/ mixes in other artists from givelifebacktomusic.com. archive.org returns
  500 errors and truncated files: download from the storage host in metadata (`server`/`dir`)
  with curl -C - and check the size against metadata. Research says training and explainer beds
  should be calm, warm instrumentals (acoustic, ukulele, light piano, light jazz) at 74–112 bpm.
- Music v5 is in the video: FreePD "Inspiration" (CC0), local copy at
  c1w1-your-role/music/freepd-inspiration.mp3, bed at music/bed-inspiration.wav (start 7.9s,
  -26 dBFS mean, natural ending lands at the video end). verify PASS. Awaiting Aroma's ear.
  Runner-up: misc/Finally See The Light (Bryan Teoh): steady, 91 bpm, but brighter and drum-led.

## 2026-10-07

- Pulled Railway's code: production /health build.commit = 310fbbc = origin/main. Merged origin/main into
  the local branch lms-creation-api-hardening (merge 20e2bd9, 3 commits: produce gate, Drive streaming
  for file routes, LMS docs). No overlap with local uncommitted work, which is untouched. No dependency
  changes. npm test: 282+37+89+9 pass. test-layout shows 5 failures that come only from this machine's
  legacy gitignored root folders (video_production/, updated/, ...) and venv/; the same test passes
  40/40 in a clean checkout.
- Live data on Railway: 5 lessons (4 offloaded to Drive), 1 course awaiting approval, nothing in
  flight. NOT pulled (asked Aroma whether she wants it).
- The local branch is still 5 commits (4 daily syncs + the merge) ahead of main and unpushed.
- Aroma asked to add a week on gender sensitivity and handling gender-related reports. Both courses
  are already 4 weeks (her max). Proposed: put it in Course 2 as Week 3, make Conflict Resolution
  Week 4, and turn the old Week 4 capstone into Week 4's final assignment (no separate video).
  Awaiting her pick. The script needs P&C's anti-harassment policy and inquiry-committee details
  (Pakistan's 2010 workplace harassment act, amended 2022); confirm them with P&C, do not invent them.
- Aroma: every skill must have situational walk-throughs, plus a named practical model for each
  skill. The course outline was redone around the models in chat: Course 1 uses Employee Lifecycle,
  Empowerment Dynamic, Fair Process, SCARF, Iceberg, RASA, OARS, Funnel, Ladder of Inference, GROW;
  Course 2 uses Three Conversations, SBI, grievance process, 4Rs, 5Ds, Thomas-Kilmann, interest-based
  negotiation. Week 1 video needs a revision pass for its models. Awaiting approval of the outline.
- Decision: Course 1 Week 1 video stays as it is. The models and walk-throughs apply to every
  remaining video (C1 W2–W4, C2 W1–W4). Next: write the C1 W2–W4 scripts as PDFs for review.
- Week 1 music raised 5 dB at Aroma's request: the bed now averages -21 dBFS and ducks to -29.3 dB
  under the VO (it was -34.3). Re-stitched; verify PASS.
- C1 W2–W4 scripts drafted (research.md in each folder from 3 research subagents; beats.js in the
  "you" voice, named models plus 2 walk-throughs each, checkpoint ~2/3 through; qa-checkpoint PASS).
  PDFs: pc-people-skills/pdf/course1-weeks2-4-scripts.pdf plus one per week (make-pdfs.js).
  WAITING for Aroma's review before any TTS. Before building, new templates are needed in
  info-lf.js: lfIceberg, lfModel, lfFunnel, lfLadder (plus their qa-info contract entries).
- Aroma rejected "Inspiration" too (the level is good, the music is not). This was the third music
  miss, so I stopped guessing and built 3 full options at the approved level (ducked bed about
  -29.5 dB, raw mean -21 dBFS): out/c1w1-your-role_option-{A,B,C}.mp4. A = Finally See The Light
  (Bryan Teoh, hopeful acoustic); B = Red Hair, Blue Sky (Monplaisir ukulele, aligned to its natural
  ending, starting 9.5s in); C = Nostalgic Piano (FreePD romantic/). Beds in music/bed-opt-*.wav.
  The approved one gets copied to c1w1-your-role_final.mp4. LESSON: when taste is the question and
  Claude cannot hear it, give the user options to compare by ear.
- Aroma PICKED option A ("Finally See The Light", Bryan Teoh, FreePD misc/, CC0) for c1w1 AND as
  THE music for style 2. c1w1 final = option A.
- NEW BUILD (in progress): an LMS video-style option. Style 1 "Character Arc" (the existing Ali
  pipeline); style 2 "Flat Motion Graphics" (LearnFree, info-only, Sulafat, music A). The style is
  chosen at course creation, stored on the queue item (like wantReferences), and switches the
  script prompt/schema, the gate prompt, LESSON_HTML, TTS voice and MUSIC_FILE in produce. A styles
  list with 10–15s preview mp4s comes from the API. Then deploy to Railway. Work happens in the
  worktree C:/Users/Aroma Tahir/wtpc (branch pc-people-skills-c1w1, PR #2) on top of the guardrail.

## 2026-10-07
- P&C outline: Aroma asked for SLOs against every week. Only 1.3–1.6 had stored wording (make-pdfs.js);
  1.1, 1.2, 2.1–2.6 were DRAFTED inline in chat, marked "(drafted)", awaiting her confirmation.
  Gender week placed as C2 W3; capstone = C2 W4 assignment. Still need P&C grievance + anti-harassment
  policy docs before writing C2 W2/W3 scripts. Once confirmed, add the final SLO text to make-pdfs.js.

## 2026-10-08

- VIDEO STYLES feature built in the worktree C:/Users/Aroma Tahir/wtpc (branch pc-people-skills-c1w1):
  orchestrator/lib/styles.js (character-arc default; motion-graphics); queue item `style`;
  script stage uses a per-style prompt and schema (video_script_motion, lf* enum, `tone`); gate uses
  script_gate_motion; produce passes style env to every command (LESSON_HTML, TTS_VOICE=Sulafat,
  TTS_STYLE, MUSIC_FILE=brand/music-motion-graphics.mp3). Planner style: course_planner_motion
  (numbered course `slos`, per-lesson sloIds/models/walkthroughs, with Aroma's outline as the worked
  example); validate refuses a motion lesson without a model or 2 walk-throughs. API: GET
  /api/v1/styles + /styles/:id/preview.mp4 (public, Range), `style` on plan/build/make-video,
  invalid_style 400, style shown on course/items/jobs. Templates: lf renderer + 4 new templates
  (lfModel/lfIceberg/lfFunnel/lfLadder) + fonts; tts-lesson honours TTS_STYLE and tone; qa-info
  has the lf contracts; stitch-brand fades the music over the last 3s. Previews (12s each) are at
  brand/style-previews/. Docs: integration-requests/2026-10-08-video-styles.md and a CONTRACT-CHANGELOG
  entry. test-server has 6 style tests (95/95, storage mutation-checked); test-regressions has 7
  style checks, and 2 old source-shape tests were updated.
- Aroma's pasted outline (canonical) for C1 W2/W3 differs from my drafted scripts: W2 walk-throughs
  should be the laptop delay (Certainty) and the restructure (Status); W3 keeps OARS. Re-align the
  W2/W3 scripts to the outline before production.
- Aroma asked to see a prototype BEFORE approving. I stopped the push to main (TaskStop) and
  confirmed nothing reached GitHub (origin/main is still 310fbbc; the remote branch is still at
  3c0d87f). The styles commit 3062067 is local-only in C:/Users/Aroma Tahir/wtpc. Prototype
  (private artifact): https://claude.ai/artifact/7XdiWffAyem4fuVvVG9HV9 (style picker with the 12s
  previews → details → plan review with SLOs/models/walk-throughs → build). WAITING for approval,
  then: `git push origin pc-people-skills-c1w1 pc-people-skills-c1w1:main` from wtpc, then
  scripts/deploy.ps1, then verify /health and GET /api/v1/styles live.
- Aroma asked for public access to the prototype. Artifacts cannot be made public on this workspace,
  so it went to GitHub Pages: https://aroma72.github.io/course-styles-prototype/ (repo
  aroma72/course-styles-prototype, neutral commit author). Still waiting on her approval to push and
  deploy the styles feature.
- Added `writingStyle` to each style (narrator, voice, rules, 5 real sample lines; motion lines
  carry their read cue). It is in GET /api/v1/styles (commit b0b3e87 in wtpc, local only) and in the
  prototype (public Pages + artifact v2). Still waiting on approval to push and deploy.
- Aroma asked to build style-picking into the LMS (Orenda-Project/Taleemabad-University). We only have
  READ access, so a subagent is building a patch in a scratchpad clone (branch feat/video-styles →
  lms-video-styles.patch + README). Done in our repo (wtpc, uncommitted): prototypes/course-builder.html
  now has the style picker on the topic card (from GET /api/v1/styles), sends `style`, and shows
  SLOs/models/walk-throughs; prototypes/course-styles-journey.html was added. Next: commit all of it
  with the patch under docs/integration-requests/, then wait for Aroma's approval to push and deploy.
- LMS patch done (subagent), committed locally in wtpc as 5b57f8f with the demo picker and journey prototype.
  The patch is at docs/integration-requests/2026-10-08-video-styles-lms/ (22 files, base ed2abff,
  migration 0067_content_video_style.sql; API and web typecheck pass; no browser or integration test).
  Product decision open: the LMS builder does not call our planner, so the patch makes instructors
  hand-write the models and walk-throughs for motion-graphics. The alternative is for the LMS to call
  POST /api/v1/courses/plan to draft them. Local commits not pushed: 3062067, b0b3e87, 5b57f8f (plus
  PR #2's). Waiting for "approved", then push to main and deploy.ps1.
- Aroma APPROVED the release and chose option (b), drafting. Added POST /api/v1/courses/draft-teaching
  (prompts/course_teaching_draft.txt; planner.draftTeaching with _setDraftAsk for tests), commit
  de97830. Pushing pc-people-skills-c1w1 to main (9 commits); deploy.ps1 comes next. The LMS
  patch subagent was resumed to switch to drafting, with a "Draft models & walk-throughs with AI"
  button that keeps the instructor's edits.
- PUSHED: origin/main = cb2860c (styles, draft-teaching, demo picker, LMS patch v1, PR #2 work, and
  a lint fix after the gate caught an unused var). The deploy (scripts/deploy.ps1 from the main
  project folder, which holds the Railway link) is running; log at C:/Users/Aroma Tahir/deploy-styles.log.
- DEPLOYED cb2860c (live /health shows it). styles list, writingStyle, draft-teaching (401 without a
  token), the index and the demo picker are all live; verify-live 9/9. BUT the previews returned 404
  preview_missing: .railwayignore drops *.mp4/*.mp3 (the .dockerignore brand/** exception was never
  mirrored there), so the music bed is missing too. Fix: negations in .railwayignore, pushed, then
  redeploy. LESSON: any served media needs BOTH .railwayignore and .dockerignore admits. Also,
  deploy.ps1 under `*>` redirection exits 1 because of the Railway CLI's "newer version" stderr
  notice, even when the deploy succeeds; check /health.build.commit instead of trusting the exit code.
- REDEPLOYED 0431b96 (via `bash scripts/deploy.sh`, exit 0, verify-live 9/9). Both style previews are
  served live: 200 video/mp4 with exact byte sizes, and Range requests return 206. The music bed
  inside the container is NOT directly verified: `railway ssh` needs an SSH key this machine does not
  have. It is admitted by the same .railwayignore negation that fixed the previews. Verify on the
  first live motion-graphics render, where stitch-brand must not log "synthesizing a calm piano bed".
  The LMS patch update (option b) is still with the subagent.
- DONE 2026-10-08: the LMS patch v2 (option b, drafting) was pushed to main (docs only, no deploy
  needed). Live Railway is 0431b96. The LMS developer's entry points are
  docs/integration-requests/2026-10-08-video-styles.md and 2026-10-08-video-styles-lms/ (patch +
  README) plus the Pages prototype. Open items: confirm the motion music bed on the first live
  motion-graphics render; re-align the C1 W2/W3 scripts to Aroma's outline; produce W2–W4; clean
  up the worktree C:/Users/Aroma Tahir/wtpc (unlink the node_modules junction first).
- KEY AUDIT (2026-10-08, read-only calls, no values printed): GOOGLE_STUDIO_API_KEY is INVALID (voiceovers,
  grammar check and Gemini art are blocked); ANTHROPIC_API_KEY is INVALID (401); ELEVENLABS_API_KEY is
  recognised but scoped (no user_read; legacy, unused); KIE_API_KEY is valid with 8 credits;
  GEMINI_OMNI_API_KEY is valid with 866 credits (i2v motion); CONTENT_API_TOKEN, Claude_setup_token and
  the YouTube refresh flow are all valid. The checker script is scratchpad/keycheck.js. Week 2–4
  production is blocked until Aroma replaces GOOGLE_STUDIO_API_KEY.
- The new GEMINI_API_KEY (Aroma added it 2026-10-08) is VALID and preferred by config.js over the dead
  GOOGLE_STUDIO_API_KEY. Producing C1 W2–W4 via scratchpad/produce-w234.sh (log:
  C:/Users/Aroma Tahir/produce-w234.log). W2/W3 scripts were re-aligned to Aroma's outline first.
- QUESTION guardrail built in wtpc (not yet committed): export-checkpoint.js also writes QUESTION.md;
  verify.js check 6 enforces both locally (mutation-tested) and passes on the server via
  CHECKPOINT_HANDOFF=api, which produce.js sets, because there the API serves the question from
  beats.js and no files exist. Needs regression tests, then commit, push and deploy.
- Aroma: "don't make the videos yet, just the scripts; I will tell you when". Production STOPPED.
  Week 2's TTS had already completed (20 clips, ~$0.04; kept and cache-keyed, so it will not be
  re-billed); nothing was rendered; W3/W4 untouched. Script PDFs were regenerated (W2/W3 now aligned)
  and each W2–W4 folder has a script-stage QUESTION.md. The guardrail commit 252cbf6 was pushed to
  main; it is NOT deployed yet (it ships with the next deploy). WAIT for Aroma's go before any video.
- Aroma: "produce video 2". ONLY Week 2 (c1w2) is in production (log: C:/Users/Aroma Tahir/produce-w2.log).
  W3/W4 wait for her explicit go.
- W2 compile crashed at ~2040/4081 frames ("Attempted to use detached Frame": a Chrome worker died,
  likely memory, with 6 workers). Retrying with RENDER_WORKERS=3. TTS was reused from cache (no
  spend). LESSON: on this laptop, use RENDER_WORKERS=3 for the ~4000-frame LearnFree renders.
- VIDEO 2 DONE: pc-people-skills/c1w2-beyond-the-reaction/out/c1w2-beyond-the-reaction_final.mp4 (141s).
  verify PASS including the question guardrail; eval-text 60/0 PASS; music is the style bed, ducked to
  -28.4 dB. Question: pause at 105.3s; QUESTION.md + checkpoint.json are written. Not committed to the
  repo yet. W3/W4 wait for Aroma's go.

## 2026-10-09

- Wrote the LMS developer spec as a Claude Doc, "Video Styles in the Course Builder: LMS Integration Spec":
  https://claude.ai/code/artifact/1e71e9e8-ca24-402a-9112-2ab35cde721f (summary, the two styles, the
  journey diagram, UI spec, API reference, data model + migration 0067, the LMS implementation guide,
  the error matrix, the checkpoint rule, the test script + sign-off, rollout + references). Exportable
  to Word/PDF/Google Docs for the LMS developer.
- Exported the spec to Word: C:/Users/Aroma Tahir/Downloads/Video Styles - LMS Integration Spec.docx
  (80,549 bytes, matches the export). Docs export returns base64 in JSON; decode data.bytes_b64.

## 2026-10-13

- Aroma said "go on, make them": producing C1 W3 + W4 (scratchpad/produce-w34.sh, log
  C:/Users/Aroma Tahir/produce-w34.log), with RENDER_WORKERS=3 and a fallback to 2. The current
  templates were synced first (QUESTION.md exporter, verify check 6). The Gemini key is still valid.
  Also gave Aroma one-paste prompts for C1 (short) and C2 (full) and one-line SLOs per C1 week (chat only).
- VIDEO 3 DONE: c1w3-listen-then-ask_final.mp4 (verify PASS, eval-text 73/0, question at 95.3s).
- W4 qa-frames FAILED (beat 18: the lfOptions "Their choice" tag ran 41px off-canvas beside a long
  option), but produce-w34.sh did NOT stop on it and kept rendering. Stopped it by hand; the tag now sits
  on its own line under the chosen option (template + W4 copy, qa-frames PASS); W4 re-rendering.
  LESSON: production scripts must STOP when qa-frames fails (check its exit code), never just print it.
- The W4 re-render failed at start with ENOTEMPTY: compile could not wipe the frames/lesson left by the
  stopped run (Windows delete lag after killed workers). Removed the folder with Remove-Item and
  restarted. LESSON: after stopping a render, clear frames/<dir> before re-running.
- W4 first full render passed verify, but eval-text found 1 error (beat 02: "their feeling" → "their
  feelings"). Fixed in beats.js; re-voicing beat 02 only (cache), then re-render (log produce-w4b.log;
  this script now stops on a qa-frames FAIL).
- VIDEO 4 DONE: c1w4-warm-but-fair_final.mp4 (verify PASS incl. the question guardrail; eval-text 67/0
  after the "feelings" fix; question at 1:26). COURSE 1 W1–W4 ALL PRODUCED.
- BUG FOUND + FIXED (template, uncommitted in wtpc, and the c1w* folders): tts-lesson.js deleted
  raw_<id>.wav after processing, but the cache check requires raw_<id>.wav, so EVERY re-run re-voiced
  and re-billed every line (W4's 1-line fix re-voiced all 20, about $0.04). W2's re-run only hit the cache
  because its first run was killed before the delete. Now the raw clips are kept. Not yet proven live
  (the next TTS re-run should show no "synth" lines). Needs commit + push with the lfOptions tag fix.

## 2026-10-13 (music: soothing + quieter for motion-graphics style)
- Aroma asked for softer, quieter music in the flat motion-graphics style. Made 2 options on c1w1: out/c1w1-your-role_soothing-1.mp4 (FreePD "Chill Breathe", Frank Nora, CC0) and _soothing-2.mp4 ("Dreamy Piano Fantasy", Rafael Krux, CC0). Both levelled to -25 dBFS mean (was -21), so about 4 dB quieter. Both PASS verify. Levelled files are in the session scratchpad music/soothe_s4.mp3 / soothe_s1.mp3.
- NEXT: when Aroma picks one, copy it over wtpc brand/music-motion-graphics.mp3, regenerate the motion-graphics style preview, then resume the held deploy (commit the template fixes + W2-W4 folders, catalogue manifest, push pc-people-skills-c1w1:main, bash scripts/deploy.sh). The W4 robocopy into wtpc may still be running; delete the copied .chrome-profile dirs.
- DECIDED 2026-10-13: Aroma picked option 2 = "Dreamy Piano Fantasy" (Rafael Krux, FreePD CC0) at -25 dBFS mean for the Flat Motion Graphics style. All 4 P&C c1w finals re-stitched with it (verify PASS, quiz times unchanged). Brand mp3 + 12s preview (cut of c1w1 final at 7.3s) replaced in wtpc; committed b1c14fb, pushed to main, deploy.sh run.
- Upstream (Abdulrehman, e7fa11a) had fixed lfOptions overflow differently (row wrap + tighter pitch) — kept theirs, dropped my own-line tag fix. Also: they found the PRODUCTION Gemini key on Railway is refused (API_KEY_INVALID), so motion lessons on Railway get no voice until a person replaces GEMINI_API_KEY there.
- Deploy confirmed 2026-10-13: /health build.commit = b1c14fb, verify-live 9/9, new style preview served (200).
## 2026-10-20 (contract 1.4 — script-first single videos, branch feat/contract-1.4)

- Built the LMS's 1.4 request (E:\Nazim\.claude\docs\planning\2026-10-20-content-queen-1.4-request.md)
  plus the user's widening (instructor picks style / lengthMinutes / voiceover / purpose on create;
  Ali + checkpoint relax per purpose). Reply written for Nazim:
  docs/integration-requests/2026-10-20-content-queen-1.4-reply.md. Changelog 1.4 entry added.
- New modules: orchestrator/lib/{context,options,purpose,est-seconds,script-checks}.js,
  server/lib/capabilities.js, templates/lib/checkpoint-checks.js (qa-checkpoint.js is now a CLI
  around it; CHECKPOINT_REQUIRED=0 relaxes), templates/silent-durations.js (voiceover:false path:
  SILENT=1, mix-audio lays anullsrc, verify skips clip checks), prompts/video_purpose_*.txt.
- Routes: script/edit ($0, sync, new sha, 422 check_failed on NEW findings only), script/revise
  (written -> revising -> written, cap 5 -> 409 revision_cap, spentUsd on script.revisions[]),
  produce scriptSha -> 409 sha_mismatch, make-video body 1 MB + JSON 413/400 error middleware.
  Flags MAKE_VIDEO_CONTEXT / _SCRIPT_EDIT / _SCRIPT_REVISE, off by default -> 400 capability_disabled.
- Decisions worth defending: `revising` is a new status because restore() fails `running` on
  boot and a revise has a good script to fall back to; a flag-off request is REFUSED not ignored
  (the LMS must never believe a document was used); spine now carries `scope` through a sensor
  redraft (closes a 1.3 gap too: a second draft used to get the full patch schema).
- Things the request assumed that were not true: notes silently truncated at 2000 (still is);
  express.json 32kb cap; no `revision_cap`/`script-approval` status; caption <= 8 words enforced
  nowhere; no "data not instructions" framing anywhere. All recorded in the reply.
- Rules doc: CLAUDE.md + SCRIPTING_STANDARDS §3b got a "purpose exemption" line marked PENDING
  Aroma's sign-off — do not build marketing/announcement videos until she agrees.
- Tests: regressions 361/0, server 112/0, store/predeploy/layout green, lint clean, skill evals
  387/387. verify-all tier 1: the /health ok:false test fails ONLY under verify-all (it loads .env
  with a budget; health reads config at load) -- pre-existing, not 1.4; qa-checkpoint fixture
  needed templates/lib copied (fixed in verify-all.js).
- NEXT: (1) Aroma signs off the purpose exemption; (2) commit on feat/contract-1.4 (never stage the
  memory files whole -- other sessions edit them); (3) push <branch>:main + .\scripts\deploy.ps1
  with the three flags OFF, confirm /health.contractVersion 1.4 and verify-live; (4) quote one real
  scoped revise (~$0.5) under paid-run-protocol; (5) flip flags in Railway, send Nazim the reply;
  (6) known gap: edit cannot clear a field (applyEdits drops empties) -- add `null` = clear if asked.

