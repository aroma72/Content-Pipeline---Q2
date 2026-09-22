'use strict';
/*
 * FIXTURE — the line that destroyed a finished lesson on 2026-09-19.
 *
 * eval-text.js failed the run on beat 04 with:
 *   "Have I got that right" — The sentence is a question but lacks a question mark.
 *
 * It is reported speech inside a narrated sentence. A question mark does not belong
 * there, and would be inaudible if it did. The judge had PASSED this same text
 * before the spend and failed it after the render.
 *
 * EXPECTED: pass. A judge that fails this is costing us finished videos.
 */
module.exports = [
  { id: '01', mode: 'ali', vo: 'Mrs Bashir rings the school and says the fee she paid on Tuesday is still showing as due.',
    cap: 'The call', art: 'Ali at a front desk, phone to his ear, listening' },
  { id: '02', mode: 'ali', vo: 'Ali jumps straight in and asks her to send the receipt.',
    cap: 'The jump', art: 'Ali speaking quickly, hand raised' },
  { id: '03', mode: 'ali', vo: 'She gets louder, repeats the whole story, and the call runs eleven minutes.',
    cap: 'Eleven minutes', art: 'A clock on the wall behind Ali' },
  { id: '04', mode: 'ali', vo: 'Then he asks, have I got that right, and he stops talking.',
    cap: 'He stops talking', art: 'Ali quiet, listening, pen down',
    overlay: 'Have I got that right?' },
  { id: '05', mode: 'ali', vo: 'She says yes, drops her voice, and only then does he ask for the receipt.',
    cap: 'Only then', art: 'Ali writing, calm' },
];
