---
'@basenative/components': patch
---

Fix calendar event placement for events not on the hour, and the one-row shift
of every hour label and drop slot.

`renderCalendar` emitted a fractional `grid-row` start (`grid-row: 4.5 / span 2`)
for any event starting at 09:30, 10:15 or 14:45; the invalid declaration was
dropped, and the absolutely positioned block fell back to covering its whole day
column and swallowing every click and drag beneath it. Event rows are now
integers, and the sub-hour remainder trimmed off the top and bottom of the row
span travels in `--bn-calendar-event-rows`, `--bn-calendar-event-lead` and
`--bn-calendar-event-trail`, which `components.css` turns into an inset offset —
so a 09:30 booking still sits half a row down rather than being rounded onto the
hour.

Hour labels and drop slots were numbered for the outer grid (`+2`, past the
header row) but live inside subgrids whose local row 1 already is the first hour
row, so every row rendered one hour low, the last two hours shared one band, and
the top band had no drop target. All three emissions now use `h - hours.start + 1`:
7am is row 1 on the default grid, and a 9:00–11:00 event is `grid-row: 3 / span 2`.
