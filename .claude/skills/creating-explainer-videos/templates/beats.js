'use strict';
/*
 * beats.js — THE single source of truth for one video.
 * One beat = one voiceover sentence + the visual that plays while it's spoken.
 *
 * Follows the house scripting standard: ONE named, invented protagonist
 * (here: Ali, a statistician) carried in depth through one scenario — NOT a
 * list of domain examples. See .claude/standards/SCRIPTING_STANDARDS.md.
 *
 * FIELDS
 *   id      stable, ordered — drives layers/<id>/, audio/vo_<id>.wav
 *   mode    "ali" | "scene" | "info"
 *   vo      one spoken sentence — plain, short, read-aloud-able (7–14 words)
 *   cap     on-screen caption / lower-third text
 *   art     Imagen prompt (ali/scene beats only) — clean-hero rules (Law 4)
 *   overlay {tpl,data}  optional synced infographic on an ali beat
 *   info    {tpl,data}  required on info beats — template lives in animation/info.js
 *
 * LAWS (see SKILL.md): no title-card beats; scenes preferred over floating
 * characters for story; infographics must EVOLVE; one concept per video.
 */

const CREAM = 'plain flat cream background #F5F1E8, centered, standing, full body, ' +
  'props float detached and never touch the character, no desk, no scenery, no ground, ' +
  'no shadow, no dark or navy fill, soft flat editorial illustration';

module.exports = [
  {
    id: '01',
    mode: 'scene',
    vo: 'Meet Ali, a statistician who runs the same report every Monday.',
    cap: 'Ali · statistician',
    art: `A friendly statistician named Ali at the start of his work week, warm editorial scene with depth, ${CREAM}`,
  },
  {
    id: '02',
    mode: 'ali',
    vo: 'Every week he re-explains the exact same steps to his agent.',
    cap: 'Re-explaining, every time',
    art: `Ali looking a little tired, gesturing at a floating list of repeated instructions, ${CREAM}`,
    overlay: { tpl: 'checks', data: { title: 'Every Monday', items: ['Drop empty rows', 'Check totals', 'Flag outliers', 'Write it up'] } },
  },
  {
    id: '03',
    mode: 'info',
    vo: 'The fix is a skill file: one standard procedure for one task.',
    cap: 'A skill file = an SOP',
    info: { tpl: 'fourparts', data: { title: 'A skill file has four parts', parts: ['Name', 'When to use', 'Steps', 'One example'] } },
  },
  {
    id: '04',
    mode: 'ali',
    vo: 'He writes it once, and the agent repeats it the same way forever.',
    cap: 'Write once · reuse forever',
    art: `Ali smiling, relieved, holding one tidy floating document labeled with a clear title, ${CREAM}`,
  },
  {
    id: '05',
    mode: 'info',
    vo: 'One rule above all: one skill, one job.',
    cap: 'One skill · one job',
    info: { tpl: 'gauge', data: { label: 'Tasks per skill', value: 1, max: 5, good: 'focused', bad: 'bundled' } },
  },
  {
    id: '06',
    mode: 'scene',
    vo: 'Pick the task you repeat most, and write its procedure down.',
    cap: 'Your move',
    art: `Ali confidently starting a fresh task, forward-looking editorial scene with depth, ${CREAM}`,
  },
];
