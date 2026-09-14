# Backlog

One file per unit of work. A session with none of the originating
conversation in context should be able to read one ticket and execute it
without rediscovering anything — that is what these are for, and a ticket
that does not meet that bar is not finished.

**Sources.** Most of these come from the 2026-09-12 journey audit, which
drove every product as a user and reproduced each defect. Each was then
re-verified against main before being written down, so a ticket here is a
defect that still existed at that commit — not an audit note.

**Conventions.** `status` is `open` until the fixing PR merges, then the
file is deleted (git history is the archive). `decision` names a question
only the owner can answer; those are blocked, not stalled. `depends_on`
means what it says — do not start a ticket whose dependencies are open.
Every `file:line` in a ticket was read before it was written; if one is
stale, fix it in the same PR that discovers it.

## Blocked on a decision

- [`BN-018`](BN-018.md) — Catalogue summaries and component footers advertise filtering, sorting, expand/collapse, chip editing, arrow-key navigation and windowing that no shipped code implements
  - **"Should @basenative/components ship the working interaction for these components (a small client-side script per component, the way it already does for tabs and the calendar), or stay a markup-only library with the website's descriptions rewritten to promise only markup?"**

## Serious

## Annoying

---

1 open ticket.
