'use strict';
/**
 * next-action -- who has to do what next, for every course lesson, stated by the server.
 *
 * WHY THIS EXISTS (contract 1.5, 2026-10-26)
 * The first Course Builder users rated it 7/10, and the only two places anyone got stuck
 * were both "I did not know it was my turn": one did not see that a course was waiting for
 * their review, the other did not know how to begin. Every fact needed to say so was
 * already on GET /courses/:courseId -- `status`, eleven `blockedBy` values, `redosLeft` --
 * but turning those into "this is waiting for YOU, and here is what to do" was left to each
 * client. A rule kept in two places drifts (it already had: blockedBy reached eleven values
 * in code while the docs listed six), and a value the LMS did not map is a lesson that
 * silently looks like it is still working.
 *
 * So the server answers the question directly, the same way `deliverableAvailable`
 * answers "can I fetch it" instead of publishing a rule to infer it:
 *   - per lesson:  `nextAction` {who, kind, title, detail, actions, since} and `stage`
 *   - per course:  `attention` {needsYou, byKind, headline, oldestSince, nextLessonId}
 *   - per tenant:  GET /api/v1/courses/attention, everything waiting on the caller
 *   - the guide:   GET /api/v1/guide/course-builder, the steps of building a course
 *
 * `who`: 'you' = the instructor must act or nothing moves; 'us' = paused on the Content
 * Queen side, nothing the instructor can do; 'nobody' = the machine is working, or it is
 * finished. `actions` are the route names that will be accepted for this state, so a UI
 * shows exactly the buttons that work and no others.
 */

const KIND = {
  READ_SCRIPT: 'read-script',
  WATCH_VIDEO: 'watch-video',
  CHECK_FLAGGED_VIDEO: 'check-flagged-video',
  APPROVE_SPEND: 'approve-spend',
  RESTART: 'restart',
  RETRY_OR_SKIP: 'retry-or-skip',
  WAIT_FOR_SUPPORT: 'wait-for-support',
  WAIT: 'wait',
  NONE: 'none',
};

// The route each action calls, relative to /api/v1/courses/:courseId/lessons/:lessonId.
const ACTION_ROUTES = {
  'approve-script': 'POST …/script/approve',
  'revise-script': 'POST …/script/revise',
  'approve': 'POST …/approve',
  'redo-scenes': 'POST …/video/revise',
  'reject': 'POST …/reject',
  'requeue': 'POST …/requeue',
  'skip': 'POST …/skip',
  'cancel': 'POST …/cancel',
};

/**
 * The lesson's stage on its own six-step path. One lesson is built at a time, so this is
 * what a per-lesson progress bar shows.
 */
const STAGES = [
  { id: 'queued', label: 'Waiting its turn' },
  { id: 'script', label: 'Writing the script' },
  { id: 'script-review', label: 'Your script review' },
  { id: 'build', label: 'Making the video' },
  { id: 'video-review', label: 'Your video review' },
  { id: 'published', label: 'Published' },
];

function stageOf(item) {
  const at = (id, extra = {}) => {
    const index = STAGES.findIndex((s) => s.id === id);
    return { id, label: STAGES[index].label, index: index + 1, of: STAGES.length, ...extra };
  };
  if (item.status === 'done') return at('published');
  if (item.status === 'failed') return at(item.scriptApproved ? 'build' : 'script', { stopped: true });
  if (item.status === 'blocked') {
    if (item.blockedBy === 'script-approval') return at('script-review');
    if (['review', 'post-render-check', 'qa-no-evidence'].includes(item.blockedBy)) return at('video-review');
    // `upload` happens after the video was approved: publishing is what is paused
    if (item.blockedBy === 'upload') return at('published', { paused: true });
    return at(item.scriptApproved ? 'build' : 'script', { paused: true });
  }
  if (item.status === 'claimed') return at(item.scriptApproved ? 'build' : 'script');
  // queued: either never started, or released by an approval and waiting for the worker
  if (item.reviewApproved) return at('published', { publishing: true });
  if (item.scriptApproved) return at('build');
  return at('queued');
}

/**
 * What happens next for one lesson.
 * @param {object} item   the queue item (as GET /courses/:courseId reads it)
 * @param {object} ctx    { since, queuePosition, redosLeft, residueAvailable }
 */
function forItem(item, ctx = {}) {
  const since = ctx.since || item.updatedAt || null;
  const out = (who, kind, title, detail, actions = []) => ({ who, kind, title, detail, actions, since });

  if (item.status === 'done') {
    return out('nobody', KIND.NONE, 'Published', 'This lesson is finished and published.');
  }
  if (item.status === 'failed') {
    if (item.skipped === true) return out('nobody', KIND.NONE, 'Skipped', 'This lesson was skipped and will not be built.');
    if (item.cancelled === true) return out('nobody', KIND.NONE, 'Cancelled', 'This lesson was cancelled.');
    if (item.stoppedWithCourse) {
      return out('nobody', KIND.NONE, 'Stopped with the course',
        'This lesson stopped when another lesson in the course was rejected.');
    }
    return out('you', KIND.RETRY_OR_SKIP, 'This lesson failed — try again or skip it',
      'Something went wrong while building it. Try it again, or skip it so the rest of the course can continue.',
      ['requeue', 'skip']);
  }
  if (item.status === 'blocked') {
    switch (item.blockedBy || 'review') {
      case 'script-approval':
        return out('you', KIND.READ_SCRIPT, 'Read and approve the script',
          'The script is ready. Nothing is spent on the video until you approve it, or ask for changes.',
          ['approve-script', 'revise-script', 'cancel']);
      case 'review': {
        const redo = Number(ctx.redosLeft) > 0 && ctx.residueAvailable;
        return out('you', KIND.WATCH_VIDEO, 'Watch the video and approve it',
          'The video is finished. Approve it to publish it, '
            + (redo ? 'send named scenes back to be redone, ' : '')
            + 'or reject it.',
          redo ? ['approve', 'redo-scenes', 'reject'] : ['approve', 'reject']);
      }
      case 'post-render-check':
      case 'qa-no-evidence':
        return out('you', KIND.CHECK_FLAGGED_VIDEO, 'A quality check flagged the video — please watch it',
          'The video was made, but an automatic check was not sure about it. Watch it, then approve or reject it.',
          ['approve', 'reject']);
      case 'spend-approval':
        return out('you', KIND.APPROVE_SPEND, 'Approve the cost to continue',
          'This lesson needs money that was not approved in advance. Approve to continue, or reject it.',
          ['approve', 'reject']);
      case 'interrupted':
      case 'time-ceiling':
        return out('you', KIND.RESTART, 'This lesson stopped part-way — start it again',
          'The build was cut off before the video was finished. Approve to build it again, or reject it.',
          ['approve', 'reject']);
      default: // preflight, produce-input, upload, nazim: nothing the instructor can fix
        return out('us', KIND.WAIT_FOR_SUPPORT, 'Paused on our side',
          'This lesson is paused for a reason the Content Queen team has to fix. You do not need to do anything.');
    }
  }
  // queued or claimed: the machine is working
  if (item.status === 'claimed') {
    const st = stageOf(item);
    return out('nobody', KIND.WAIT, st.id === 'build' ? 'Making the video' : 'Writing the script',
      st.id === 'build'
        ? 'The video is being made. This usually takes 20 to 40 minutes. We will show it here for you to review.'
        : 'The script is being researched and written. This usually takes a few minutes.');
  }
  const pos = ctx.queuePosition;
  return out('nobody', KIND.WAIT, pos ? `Waiting its turn (number ${pos} in line)` : 'Waiting its turn',
    pos ? 'Lessons are built one at a time. This one starts when the lessons ahead of it are done.'
      : 'This lesson starts after the lesson before it in the course has been reviewed.');
}

const PLURAL = {
  'read-script': ['script to read', 'scripts to read'],
  'watch-video': ['video to watch', 'videos to watch'],
  'check-flagged-video': ['flagged video to check', 'flagged videos to check'],
  'approve-spend': ['cost to approve', 'costs to approve'],
  'restart': ['stopped lesson to restart', 'stopped lessons to restart'],
  'retry-or-skip': ['failed lesson to retry or skip', 'failed lessons to retry or skip'],
};

/** The course-level answer: how many lessons wait on the instructor, and the sentence to show. */
function summarise(items) {
  const mine = items.filter((i) => i.nextAction && i.nextAction.who === 'you');
  const byKind = {};
  for (const i of mine) byKind[i.nextAction.kind] = (byKind[i.nextAction.kind] || 0) + 1;
  const oldest = mine.slice().sort((a, b) => String(a.nextAction.since || '').localeCompare(String(b.nextAction.since || '')))[0];
  const parts = Object.entries(byKind).map(([k, n]) => `${n} ${PLURAL[k] ? PLURAL[k][n === 1 ? 0 : 1] : k}`);
  const ours = items.filter((i) => i.nextAction && i.nextAction.who === 'us').length;
  const working = items.filter((i) => i.nextAction && i.nextAction.kind === 'wait').length;
  let headline;
  if (mine.length) {
    headline = `${mine.length === 1 ? '1 lesson is' : `${mine.length} lessons are`} waiting for you: ${parts.join(', ')}.`;
  } else if (ours) {
    headline = 'Nothing needs you right now. A lesson is paused on our side and the team has to resume it.';
  } else if (working) {
    headline = 'Nothing needs you right now. We will show the next script or video here when it is ready.';
  } else {
    headline = 'Nothing needs you. Every lesson in this course is finished.';
  }
  return {
    needsYou: mine.length,
    byKind,
    headline,
    oldestSince: oldest ? oldest.nextAction.since : null,
    nextLessonId: oldest ? oldest.id : null,
  };
}

/** Course id from a course lesson's notes (`[courseId] brief…`, always first). */
function courseIdOf(item) {
  const m = /^\[([^\]]+)\]/.exec(String(item.notes || ''));
  return m ? m[1] : null;
}

/**
 * When each lesson ENTERED its current status. `updatedAt` is not that: a Drive offload
 * re-stamps it without changing the status, so "waiting since" would jump forward.
 */
function statusSince(events) {
  const last = new Map();
  const since = new Map();
  for (const ev of events) {
    if (!ev || !ev.id || !ev.status) continue;
    const prev = last.get(ev.id);
    // An event that keeps the status and says nothing about blockedBy (a Drive offload)
    // keeps the block it was in -- it is the same wait, not a new one.
    const blockedBy = 'blockedBy' in ev ? ev.blockedBy
      : (prev && prev.status === ev.status ? prev.blockedBy : null);
    if (!prev || prev.status !== ev.status || prev.blockedBy !== blockedBy) {
      since.set(ev.id, ev.updatedAt || ev.at || ev.createdAt || null);
    }
    last.set(ev.id, { status: ev.status, blockedBy });
  }
  return since;
}

/**
 * Getting started, served rather than documented so the LMS shows the same steps the
 * service actually runs (the way GET /api/v1/styles is served).
 */
const GUIDE = {
  title: 'Build a course in four steps',
  summary: 'You describe the course, approve the plan, then read each lesson\'s script and watch each video. '
    + 'We do the research, writing and video making in between. Nothing is spent on a video until you approve its script.',
  steps: [
    {
      id: 'describe', title: 'Describe your course', youDo: 'Give the course a topic, who it is for and the style of video.',
      weDo: 'We research the topic and propose a plan: modules, lessons and what each lesson teaches.',
      takes: 'A few minutes', route: 'POST /api/v1/courses/plan',
    },
    {
      id: 'approve-plan', title: 'Approve the lesson plan', youDo: 'Check the lessons, change what you need, and start the build.',
      weDo: 'We start on the first lesson. Lessons are made one at a time, in order.',
      takes: 'A few minutes', route: 'POST /api/v1/courses/build',
    },
    {
      id: 'read-script', title: 'Read each script', youDo: 'When a script is ready, read it. Approve it, or ask for changes.',
      weDo: 'We write the script in about two minutes, then wait for you. The video is only made after you approve.',
      takes: 'A few minutes per lesson', route: 'POST /api/v1/courses/:courseId/lessons/:lessonId/script/approve',
      signal: 'nextAction.kind = "read-script"',
    },
    {
      id: 'watch-video', title: 'Watch each video', youDo: 'When a video is ready, watch it. Approve it, ask for scenes to be redone, or reject it.',
      weDo: 'We make the video in about 20 to 40 minutes, then wait for you. Approving publishes it and starts the next lesson.',
      takes: 'The length of the video', route: 'POST /api/v1/courses/:courseId/lessons/:lessonId/approve',
      signal: 'nextAction.kind = "watch-video"',
    },
  ],
  whileYouWait: 'You do not need to keep the page open. The course page shows "waiting for you" whenever a script or video is ready.',
};

module.exports = { KIND, ACTION_ROUTES, STAGES, stageOf, forItem, summarise, courseIdOf, statusSince, GUIDE };
