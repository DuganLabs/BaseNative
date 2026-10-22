# Design system progress

Session date: 2026-10-22

## Tier

Molecules, on `cursor/apple27-molecules-98aa`, stacked on the atoms branch.

Tokens PR: https://github.com/DuganLabs/BaseNative/pull/293

Atoms PR: https://github.com/DuganLabs/BaseNative/pull/294

The molecules pull request is opened from this branch. Pages are not recomposed. The molecules tier is not a pass: most of its cells are rendered and still pending.

## Coverage

- Cells: 3240
- Verified: 0.7% (24 cells)
- Rendered: 54.6%
- Source: `docs/design-system/coverage.json`, fed by `docs/design-system/verified.json`

A cell is `pass` only when `scripts/design-system-verify.js` measured it against the kit frame. The 24 passes are the iOS large prominent, bordered, and borderless buttons (height 50, capsule or radius 12, accent blue `rgb(0, 136, 255)`, bordered fill `rgba(118, 118, 128, 0.12)`) and the iOS large segmented control (height 50, radius 100), each at light and dark and at 320, 768, and 1280. Hover, pressed, focus, and disabled stay pending. Kit PNGs are not in the repo.

Row captures from that measurement:

- `/opt/cursor/artifacts/design-system/molecules/ios-buttons-row-light-1280.png`
- `/opt/cursor/artifacts/design-system/molecules/ios-segmented-row-light-1280.png`
- `/opt/cursor/artifacts/design-system/molecules/molecule-states-light-1280.png`

## Deploy

#292 is merged as `0e769bc0`. Deploy to Cloudflare Pages succeeded: https://github.com/DuganLabs/BaseNative/actions/runs/39805537732

`https://basenative-docs.pages.dev/` serves the #290 home page. Apex `https://basenative.com/` returned Cloudflare's challenge (HTTP 403) from this runner.

- `/opt/cursor/artifacts/production/home-light-320.png`
- `/opt/cursor/artifacts/production/home-light-768.png`
- `/opt/cursor/artifacts/production/home-light-1280.png`
- `/opt/cursor/artifacts/production/home-dark-320.png`
- `/opt/cursor/artifacts/production/home-dark-768.png`
- `/opt/cursor/artifacts/production/home-dark-1280.png`
- `/opt/cursor/artifacts/production/basenative-com-challenge-or-home.png`

## Blocked

- Page recomposition. Organisms and templates are not verified.
- Apex screenshots of basenative.com. The custom domain challenged this runner.
- Axe `color-contrast` and `page-has-heading-one` on unrebuilt routes. Named in `tests/e2e/design-system.spec.js` (`AXE_DEBT`).
- Catalog ARIA on `/design-system`: `aria-allowed-role`, `aria-dialog-name`, `heading-order`, `landmark-complementary-is-top-level`, `landmark-unique`, `scrollable-region-focusable`.
- WebGL/SVG refraction is not ported. Extra DOM would break the semantic-HTML axiom.
- CI on #293 and #294 is not green yet. The latest failure before the lint follow-up was Node 22 `no-useless-assignment` in `packages/db/src/adapters/sqlite.js` (run 39807471919). The initializer is removed (`ad4277f` on tokens, `f22bf7e` on atoms). That rerun is not confirmed in this note.

## Next task

Organisms tier: forced states on the organism hosts, catalog ARIA that belongs to those hosts, and kit measurements for the controls a page actually uses. Builder stays last, after templates.

## Concerns

- Verified coverage is 24 of 3240 cells. Rendering a state is not a pass.
- The shell sets `data-bn-platform` on the document. At 1280 that is macOS, and those rules were painting the iOS catalog stages. Nested iOS button and segmented rules now win. Other macOS overrides (switch, field, stepper, menu) still paint iOS stages at 1280.
- `better-sqlite3@13` engines require Node >= 22. On Node 20 `new Database()` SIGSEGV's after a successful import (runs 39805077689 and 39806233360). The adapter refuses that addon from the engines field and only constructs it after a child process opens a database. Node 20 db tests pass locally (44). CI has not confirmed the lint fix yet.
- The 50,000-tag scan passed on run 39806233360 after the 2000ms budget. That budget is the quarantine, not an algorithm change.
- Compare screenshots at 768 and 1280 differed by one code-sample glyph band and were regenerated. Home and the other routes matched.
- Axe debt is rule ids, not a count cap. `@media (max-width: 767px)` stays a literal. The overflow gate looks at `[data-bn^="bn-"]` only.

## Deviations

- Organisms shipped in the tokens PR so the catalog can render them. Pages still inherit.
- Atom and molecule hover, pressed, and focus are `data-force` on the host. Rendered, not verified, except the four rest variants named above.
- Shared footer text uses `--text-0` in `examples/express/public/styles.css`.
- CI runs on `pull_request` as well as `workflow_dispatch`. The 2026-09-14 manual-only policy still applies to the other workflows.
- Apple kits were comparison only. MIT texts are in `NOTICE`.
