'use strict';
/*
 * FIXTURE — ordinary, correct narration with the house conventions in it.
 *
 * Numbers are spelled out ON PURPOSE so the speech engine says them properly, and
 * regional usage ("ring her") is correct. Both have been flagged by this judge before
 * and both are right.
 *
 * EXPECTED: pass. This is the false-positive floor — if this fails, the judge is
 * failing videos for being written the way the house style says to write them.
 */
module.exports = [
  { id: '01', mode: 'ali', vo: 'Ali has twenty comprehension questions to mark before four fifteen.',
    cap: 'Twenty questions', art: 'Ali at a desk with a stack of papers' },
  { id: '02', mode: 'ali', vo: 'He rings her back once he has the answer, not before.',
    cap: 'Once he has it', art: 'Ali picking up a phone' },
  // First written as "Fourteen out of twenty finished in the first hour." The judge
  // failed it, and it was RIGHT -- the questions do not finish themselves. The fixture
  // was wrong, not the gate, and that is exactly what a labelled set is for: a bad
  // human label is the one error a judge can never tell you about.
  { id: '03', mode: 'info', vo: 'He marked fourteen out of twenty in the first hour.',
    cap: 'Fourteen of twenty', info: { tpl: 'gauge', data: { label: 'Marked in hour one', value: 14, max: 20 } } },
];
