# @basenative/builder

## 0.2.0

### Minor Changes

- 494a83b: Exported and canvas markup now carries the `@basenative/components` attribute
  contract, so what the Builder produces is styled by the library.

  A palette entry can declare `bn` — the `data-bn` token the matching render
  function emits — and `dataProps`, the props that component serialises as
  `data-<name>`. Both `generateBaseNative()` and the canvas renderer add
  `data-bn="<bn>"` and write those props as `data-*`. Before this, a Button set
  to Primary exported `<button variant="primary">`, which no rule in
  `components.css` matches, so it rendered as the browser's default button in
  the user's app and on the canvas alike; it now exports
  `<button data-bn="button" data-variant="primary" data-size="default"
type="button">`, the same attribute set as `renderButton()`. The default
  palette declares the token for `button`, `input`, `textarea` and `checkbox`,
  and the button gains a `size` prop (`sm` / `default` / `lg`).

## 0.1.5

### Patch Changes

- 29b958a: `<bn-builder>` registered two `bn-palette-add` listeners, so every palette click, Enter/Space activation, or drag-drop added the component twice. Only the container-aware listener (`_wirePaletteAdd`) remains. Also fixed the canvas pane rendering a nested `<main>` landmark inside the host page's `<main>`; it is now a `<section aria-label="Canvas">`.
- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

- Updated dependencies [9741b75]
  - @basenative/runtime@0.6.3

## 0.1.4

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 0.1.3

### Patch Changes

- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 0.1.2

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 0.1.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0
