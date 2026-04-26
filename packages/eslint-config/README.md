# @basenative/eslint-config

Shared ESLint flat-config preset for DuganLabs projects. One opinion, one source.

## Install

```bash
pnpm add -D eslint @basenative/eslint-config
```

## Use

Pick the preset matching your runtime. In `eslint.config.js`:

```js
// SPA / browser
import config from "@basenative/eslint-config/browser";
export default config;

// Node / scripts
import config from "@basenative/eslint-config/node";
export default config;

// Cloudflare Workers / Pages Functions
import config from "@basenative/eslint-config/worker";
export default config;

// React
import config from "@basenative/eslint-config/react";
export default config;
```

## Compose

The presets export an array — extend it:

```js
import base from "@basenative/eslint-config/browser";

export default [
  ...base,
  {
    rules: {
      "no-console": "warn",
    },
  },
];
```

## What's in it

- `@eslint/js` recommended set
- Underscore-prefix exempt for unused vars / args / caught errors
- `no-eval` / `no-implied-eval` / `no-new-func` (security baseline)
- `eqeqeq` smart, `no-var`, `prefer-const`
- Worker preset blocks Node-only globals (`process`, `Buffer`, `__dirname`, `__filename`)
- Prettier compatibility — formatting rules disabled

## License

Apache-2.0
