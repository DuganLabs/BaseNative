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

## Blocking

- [`BN-010`](BN-010.md) (small) — renderCalendar emits a non-integer grid-row start for any event not on the hour, so the block loses its placement and covers the whole day column

## Serious

- [`BN-019`](BN-019.md) (small) — renderDrawer marks a closed drawer inert and nothing ever removes it, so the open drawer's close button cannot be clicked or focused and no scrim appears
- [`BN-020`](BN-020.md) (medium) — bindDrag binds only HTML5 drag events, so the calendar's only scheduling gesture is unavailable on touch and to the keyboard
- [`BN-027`](BN-027.md) (medium) — 15 of 78 Source snippets on /components/* are not parseable JavaScript, six teach a client render API that does not exist, and four pages ship zero runnable code
- [`BN-028`](BN-028.md) (small) — /components/virtual-list renders the component as a ~2px empty sliver
- [`BN-029`](BN-029.md) (medium) — /docs advertises the API of five packages, documents two, and every import statement on it names an unpublishable package
- [`BN-035`](BN-035.md) (medium) — The Builder's exported markup carries no BaseNative attributes at all, so nothing it produces is styled by the library
- [`BN-057`](BN-057.md) (small) — "Four catalogue summaries claim capabilities absent from the CSS: textarea auto-sizing, pagination first/last, drawer any edge, select base-select"

## Annoying

- [`BN-036`](BN-036.md) (small) — The reactive pagination demo replaces the styled component with an <ol> that every layout rule misses
- [`BN-058`](BN-058.md) (small) — /compare asserts three times that BaseNative has no HMR while @basenative/hmr ships and the site's own dev server wires it first
- [`BN-059`](BN-059.md) (small) — Accordion "Expand all" opens one of three sections, and the Dialog's × has no listener while the snippet claims backdrop-click close
- [`BN-060`](BN-060.md) (small) — /showcase's pagination demo is eight real links to ?page=N on a static host that ignores the query string
- [`BN-061`](BN-061.md) (small) — /tasks accepts tasks on the published site, keeps them only in memory, and never says so
- [`BN-063`](BN-063.md) (small · after [BN-010]) — Calendar hour labels and drop slots are numbered for the outer grid but placed inside a subgrid, so every row is one hour low and the last two hours share one band
- [`BN-064`](BN-064.md) (small) — Alert dismiss and breadcrumb links are below the 24px minimum tap target (chip remove is already compliant — see Notes)

## Cosmetic

- [`BN-065`](BN-065.md) (small) — /roadmap hardcodes 'Public Packages 39'; the workspace publishes 42
- [`BN-066`](BN-066.md) (small) — /test-signals ships unlinked while the 404 promises every page is in the nav, and the build publishes no sitemap.xml, robots.txt or llms.txt

---

18 open tickets.
