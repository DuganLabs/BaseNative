---
'@basenative/components': minor
---

Make calendar events and pipeline cards movable by tap and by keyboard, not
only by mouse drag.

`initCalendarDragDrop` and `initPipelineDragDrop` bound only the HTML5 drag
events, so on a phone or tablet nothing could be rescheduled at all (a touch
drag fires no `dragstart`), and a keyboard user had no key that picked anything
up — a WCAG 2.2 failure under 2.5.7 Dragging Movements and 2.1.1 Keyboard, and
in GreenPut the product's only reschedule path.

Both initialisers now add a select-then-place path beside the drag: one tap or
click on an event or card picks it up (`data-picked`; a second tap cancels), one
tap or click on a slot or column drops it, through the same `onDrop` /
`onCardMove` payload — no consumer change. The same state machine runs from the
keyboard: events, cards and pipeline blocks render with `tabindex="0"`; Enter or
Space picks up, the arrow keys move the pending target (`data-drop-target`) by
`snapMinutes` and by day on the calendar, or by position and column on the
pipeline; Enter or Space drops; Escape cancels. Each calendar and pipeline
renders one visually hidden instruction node (`[data-bn="calendar-help"]` /
`[data-bn="pipeline-help"]`, `<id>-help`) that every movable block is
`aria-describedby`, and a polite live region (`[data-bn="calendar-status"]` /
`[data-bn="pipeline-status"]`) that announces pick-up, each move and the drop.
Calendar events also carry `data-date` / `data-hour` / `data-minute` (their
visible start) so the keyboard path begins where the event is. `components.css`
styles `[data-picked]` beside `[data-dragging]`, and `bindDrag` accepts any
event type, so one `destroy()` still tears every gesture down.
