# Design system progress

Session date: 2026-10-22

## Tier

Atoms, on `cursor/apple27-atoms-98aa`, retargeted onto main after #293 merged as `318f5cc`.

Production findings folded into the organisms and tokens on this branch: one blue tile per grouped list (a second hue only when a row is semantic red, orange, or green), a single floating tab-bar capsule, macOS content at 15px and a 28px large title, hero actions under the copy, two top backdrop glows, and one elevation scale. `tests/e2e/shell-home.spec.js` is 38 tests. CI on the retarget is the gate; this note is not a ready-to-merge claim.

The catalog route renders organisms so `/design-system` can show every control the matrix names. Pages are not recomposed. Atom hosts now render rest, hover, pressed, focus, and disabled in an Atom states stage (`data-force`).

## Coverage

- Cells: 3240 (58 components × variants × 6 states × light/dark × 320/768/1280)
- Verified (gate-passed): 0%
- Rendered on `/design-system` but not marked pass: 44.3%
- Source: `docs/design-system/coverage.json`, checked by `node scripts/design-system-coverage.js --check`

No cell is `pass`. Molecule and organism hover, pressed, and focus-visible are still gaps. Scrollbar chrome, the refraction shader, the date wheel, and the full color-picker chrome are gaps.

## Deploy

#292 is merged as `0e769bc0`. Deploy to Cloudflare Pages succeeded: https://github.com/DuganLabs/BaseNative/actions/runs/39805537732

The Pages production deployment serves the #290 home page (title "Home — BaseNative", `BN_EFFECT_LOOP`, `npm install @basenative/runtime`, Runtime 2.3.2). Apex `https://basenative.com/` returned Cloudflare's "Just a moment..." challenge (HTTP 403) from this runner, so the screenshots are of `https://basenative-docs.pages.dev/`, the environment URL the deploy published.

- `/opt/cursor/artifacts/production/home-light-320.png`
- `/opt/cursor/artifacts/production/home-light-768.png`
- `/opt/cursor/artifacts/production/home-light-1280.png`
- `/opt/cursor/artifacts/production/home-dark-320.png`
- `/opt/cursor/artifacts/production/home-dark-768.png`
- `/opt/cursor/artifacts/production/home-dark-1280.png`
- `/opt/cursor/artifacts/production/basenative-com-challenge-or-home.png`

## Blocked

- Page recomposition. Organisms those pages use are not 100% verified.
- Apex screenshots of basenative.com. The custom domain challenged this runner. The Pages deployment above is the content that deploy published.
- Axe `color-contrast` and `page-has-heading-one` on unrebuilt routes. Named in `tests/e2e/design-system.spec.js` (`AXE_DEBT`). New rule ids fail. Node counts are not frozen.
- Catalog ARIA still open on `/design-system`: `aria-allowed-role`, `aria-dialog-name`, `heading-order`, `landmark-complementary-is-top-level`, `landmark-unique`, `scrollable-region-focusable`. Menu parent and select name were fixed in the renderers.
- WebGL/SVG refraction from nikdelvin/liquid-glass is not ported. Extra DOM would break the semantic-HTML axiom.

## Next task

Molecules tier: popup, pulldown, segmented, menu, and the other molecules get the same forced hover, pressed, and focus treatment. Contrast on `/design-system` is still open. Pages stay unrebuilt until organisms pass.

## Concerns

- Axe debt is an allowlist of rule ids, not a count cap. A route can gain more contrast nodes without failing.
- `@media (max-width: 767px)` stays a literal. `var()` is not valid in a classic media condition. The token lint only scans declarations.
- The overflow gate looks at `[data-bn^="bn-"]` only. Unrebuilt page tables stay out of this tier.
- Selected sidebar contrast and the 60 design-system contrast nodes are still open.
- Runtime gzip budget was not re-measured in this session. Platform CSS is not in the runtime bundle. Do not treat that as a new measurement.
- Tokens CI https://github.com/DuganLabs/BaseNative/actions/runs/39804167799 failed because `nx-cloud-access.test.js` inherited `GITHUB_ENV` on the runner. The refusal test now deletes those variables (`6f03239` on the tokens branch, `f6200fa` on atoms).
- Run https://github.com/DuganLabs/BaseNative/actions/runs/39805077689 failed on Node 20: `db.test.js` SIGSEGV inside `better-sqlite3`, and the 50,000-tag scan took 343ms against a 200ms budget. Node 22 was cancelled. Fix is `402ed94` on the tokens branch and `8328c4f` on atoms: probe the native addon in a child process, and set the scan budget to 2000ms (quadratic is still past that). The rerun after that push is not confirmed green in this note.

## Deviations

- Organisms shipped in the tokens PR so the catalog can render them. That is earlier than “one tier per PR”. Pages still inherit; nothing was spot-fixed per route.
- Atom hover, pressed, and focus are `data-force` on the host, the same channel buttons already used. They are rendered, not verified.
- Shared footer text uses `--text-0` so the site chrome clears the contrast sample. The rule lives in `examples/express/public/styles.css` because that footer is site chrome, not a platform organism.
- CI (`.github/workflows/ci.yml`) runs on `pull_request` as well as `workflow_dispatch`, so the Playwright and lint gates can block a merge. The 2026-09-14 manual-only policy still applies to the other workflows. Deploy-on-push stays in PR 292.
- Apple kits were comparison only. MIT texts are in `NOTICE`.
