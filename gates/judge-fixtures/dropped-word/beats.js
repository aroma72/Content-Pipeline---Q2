'use strict';
/*
 * FIXTURE — a real grammatical error in narration, of the kind this gate exists for.
 *
 * Beat 02 drops "that": "proof one change helped" is the example the judge's own
 * prompt cites as a genuine error. It IS audible — a listener hears the missing word.
 *
 * EXPECTED: fail. A judge that passes this has been narrowed too far.
 */
module.exports = [
  { id: '01', mode: 'ali', vo: 'Ali wants to know whether the new seating plan made any difference.',
    cap: 'The question', art: 'Ali looking at a classroom' },
  { id: '02', mode: 'ali', vo: 'He has no proof one change helped, so he cannot tell the head teacher anything.',
    cap: 'No proof', art: 'Ali holding an empty notebook' },
  { id: '03', mode: 'ali', vo: 'So he writes down the one number he can measure before he changes anything else.',
    cap: 'One number', art: 'Ali writing a single figure' },
];
