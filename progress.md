# Design system progress

Session date: 2026-10-22

## Tier

Atoms, on `cursor/apple27-atoms-98aa`, stacked on the tokens branch.

Tokens PR: https://github.com/DuganLabs/BaseNative/pull/293

The catalog route renders organisms so `/design-system` can show every control the matrix names. Pages are not recomposed. Atom hosts now render rest, hover, pressed, focus, and disabled in an Atom states stage (`data-force`).

## Coverage

- Cells: 3240 (58 components × variants × 6 states × light/dark × 320/768/1280)
- Verified (gate-passed): 0%
- Rendered on `/design-system` but not marked pass: 44.3%
- Source: `docs/design-system/coverage.json`, checked by `node scripts/design-system-coverage.js --check`

No cell is `pass`. Molecule and organism hover, pressed, and focus-visible are still gaps. Scrollbar chrome, the refraction shader, the date wheel, and the full color-picker chrome are gaps.

## Blocked

- Page recomposition. Organisms those pages use are not 100% passing.
- Production screenshots of basenative.com. Auto-deploy is https://github.com/DuganLabs/BaseNative/pull/292 and is not merged. This branch does not contain that workflow change.
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

## Deviations

- Organisms shipped in the tokens PR so the catalog can render them. That is earlier than “one tier per PR”. Pages still inherit; nothing was spot-fixed per route.
- Atom hover, pressed, and focus are `data-force` on the host, the same channel buttons already used. They are rendered, not verified.
- Shared footer text uses `--text-0` so the site chrome clears the contrast sample. The rule lives in `examples/express/public/styles.css` because that footer is site chrome, not a platform organism.
- CI (`.github/workflows/ci.yml`) runs on `pull_request` as well as `workflow_dispatch`, so the Playwright and lint gates can block a merge. The 2026-09-14 manual-only policy still applies to the other workflows. Deploy-on-push stays in PR 292.
- Apple kits were comparison only. MIT texts are in `NOTICE`.
