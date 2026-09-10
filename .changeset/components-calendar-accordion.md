---
"@basenative/components": patch
---

Fix three visual defects surfaced by a screenshot QA pass of the showcase site:

- Calendar: the hour-gutter labels used `grid-row: h - hourStart + 1` while the time slots and events used `+ 2`, so a label sat one row above the slot/event it described (an 11:00–12:00 event could visually appear to span the 12pm–2pm rows). Labels now use the same `+ 2` convention. Calendar events also get `overflow: hidden`, `min-height: 0`, and `align-self: stretch` so a card's content can never grow its grid row, and `calendar-event-title` is clamped to 2 lines with an ellipsis.
- Accordion: `[data-bn="accordion-header"]` centred its `::before` disclosure triangle against the full header block, so a two-line summary put the marker between the lines instead of next to the first one. `align-items` is now `flex-start` with a small `margin-top` offset on the marker that keeps single-line headers pixel-identical.
- Mobile nav: the horizontally-scrolling header `menu` had no scroll affordance and could clip an item mid-glyph at the viewport edge. Added a sticky right-edge fade (progressively faded out near the end of scroll via `animation-timeline: scroll()` behind `@supports`, a constant fade otherwise) plus `padding-inline-end`/`scroll-padding-inline-end` so the last item clears the fade.
