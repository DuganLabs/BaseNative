# BaseNative — instructions for coding agents

Write BaseNative, not React, in this repository. The full cheat sheet is `docs/llm/START.md` (published as `/llms-start.txt`). The scorecard of known weaknesses is `/ai`. This file is enough to produce a correct first draft.

## Design contract

Before any UI change, read [`DESIGN.md`](DESIGN.md) and the one token sheet, `packages/components/src/tokens.css` (source: `packages/components/tokens/*.json`). Use tokens only: never hard-code a colour, length, radius, shadow or duration. `node scripts/ds-lint.js` (DS009) fails raw values outside the token sheet.

## Shape

- Templates are HTML. `{{ count() }}` interpolates text. Call the signal.
- `:attr="expr"` binds an attribute. `@click="handler($event)"` listens.
- Conditionals and lists go on `<template @if>`, `<template @else>`, `<template @for="item of items; track item.id">`, `<template @switch>`.
- State is `signal(initial)`, `computed(fn)`, `effect(fn)`, from `@basenative/runtime`. Writes are `count.set(next)`.
- Server HTML is `render(template, context)` from `@basenative/server`. The browser attaches behavior with `hydrate(root, context)`.
- Install from npmjs.org: `npm install @basenative/runtime @basenative/server`. No token. No `.npmrc`.
- One file, no build: `import { signal, computed, hydrate } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime@2/+esm'`. See `examples/cdn/index.html`.

## Behavior that models get wrong

- One `set()` settles derived computeds, then runs each affected effect once. Reading a signal and a computed derived from it is normal.
- A read inside a helper still subscribes.
- An effect that writes a signal it also read throws `BN_EFFECT_LOOP`. Use `.peek()` for that read, or write a different signal.
- `class="item" :class="done() ? 'done' : ''"` merges. A false binding adds nothing.
- `:value` and `:checked` write the DOM property.

## Do not emit

- `className`, `htmlFor`, `onClick`, `{expr}` text, `useState`, `useEffect`, `useMemo`, `dangerouslySetInnerHTML`.
- `style=""`, or a custom element like `app-header`. Use semantic HTML.
- `@if` on a `<div>`. It belongs on `<template>`.
- `eval` or `new Function`. The expression language is an allowlist.

`bn from-jsx draft.jsx` rewrites the React subset. `@basenative/validate` reports the rest with the replacement. MCP tools: `validate_template`, `render_preview`, `list_directives`, `check_expression`.

## Limits to respect

HTML closing tags cost tokens. The October 2026 benchmark measured more BaseNative code tokens than React. Do not claim a code-size win. There is no React DevTools extension and no third-party component ecosystem. Eval pass rates are unpublished because the prompt corpus is empty. Do not generate prompts, fixtures, or assertions under `packages/evals/`.

## Browser support: Baseline target

This project's Baseline target is Baseline Widely available.

Use a web platform feature (HTML, CSS, JavaScript or a Web API) without a
fallback only when it is Baseline Widely available. Anything newer needs
progressive enhancement or a fallback, and the PR should say so.

## Modern Web Guidance

Install the [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)
skill locally before writing or reviewing HTML, CSS or front-end JavaScript,
and follow it within the Baseline target above:

```sh
DISABLE_TELEMETRY=1 npx modern-web-guidance@latest install
```

It writes `.agents/skills/modern-web-guidance/` and `skills-lock.json`.
Both are gitignored here, like every marketplace skill (see `.gitignore`),
so don't commit them.

## Chrome DevTools MCP: local pre-deploy check

Before you open a PR that changes a page, check it in a real browser with
[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp).
It is a local check only. CI does not run it, and nothing here deploys.

Always run it against a fresh, throwaway Chrome profile:

- Pass `--isolated`, which creates a temporary user-data-dir and deletes it
  when the browser closes. Alternatively, pass `--userDataDir` pointing to a
  new empty temp directory.
- Never pass `--autoConnect`, and never point it at your everyday Chrome
  profile. The agent must not see a signed-in session, cookies or saved
  passwords.
- Pass `--no-performance-crux`, so performance traces don't send page URLs to
  the CrUX API.
- Point it at a local dev server or a preview/staging URL. Use production
  only for read-only checks.

Example MCP config (`.cursor/mcp.json`, `.mcp.json` or your client's
equivalent; keep it in your user config, not in the repo):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--isolated",
        "--headless",
        "--no-performance-crux"
      ]
    }
  }
}
```

Drop `--headless` to watch the browser. A typical check: open the changed
page, list console messages and failed network requests, take a screenshot
at mobile and desktop widths, and run a performance trace. Fix anything new
before pushing. The post-deploy Lighthouse run in CI (including its Agentic
browsing category) covers the same pages after merge.
