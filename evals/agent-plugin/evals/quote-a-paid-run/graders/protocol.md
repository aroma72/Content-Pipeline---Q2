---
type: llm
weight: 2
---

PASS if the response does ALL of:
  - Gives a media-spend total in the right ballpark (art 22 x $0.04 = $0.88, TTS 22 x $0.002 =
    $0.044, motion 27s x $0.05 = $1.35, total roughly $2.20-$2.35).
  - Treats the per-SECOND motion cost as a separate line, not folded into a per-beat guess.
  - Says the run needs explicit approval before the paid flags (--yes / CONFIRM_SPEND=1) are used.

FAIL if it invents a number with no arithmetic shown, omits the motion cost, quotes only a
single lump figure, or tells the user to just go ahead and run it.
