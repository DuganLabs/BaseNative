# @basenative/config

> Type-safe environment configuration with schema validation

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/config
```

## Quick Start

```js
import { defineConfig, string, number, boolean, oneOf } from '@basenative/config';

const config = defineConfig({
  schema: {
    PORT: number(),
    DATABASE_URL: string(),
    NODE_ENV: oneOf(['development', 'production', 'test']),
    DEBUG: boolean(),
  },
});

console.log(config.PORT);         // number
console.log(config.DATABASE_URL); // string
```

## With a prefix

```js
const config = defineConfig({
  schema: {
    port: number(),
    secret: string(),
  },
  prefix: 'APP_', // reads APP_PORT, APP_SECRET from env
});
```

## With Zod

```js
import { defineConfig, zodAdapter } from '@basenative/config';
import { z } from 'zod';

const config = defineConfig({
  schema: zodAdapter(z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
  })),
});
```

## API

- `defineConfig(options)` — Loads and validates config from environment variables.
  - `options.schema` — A key-to-validator map or a `zodAdapter` function.
  - `options.env` — Source object for env vars (defaults to `process.env`).
  - `options.prefix` — Optional prefix stripped before matching schema keys.

### Built-in Validators

- `string()` — Requires a non-empty string value.
- `number()` — Coerces the env string to a number; throws if not numeric.
- `boolean()` — Coerces `'true'`/`'1'` to `true`, `'false'`/`'0'` to `false`.
- `oneOf(values[])` — Requires the value to be one of the listed options.
- `optional(validator)` — Wraps any validator to allow missing/undefined values.
- `validateConfig(values, schema)` — Validates a plain object against a schema map; throws with actionable messages on failure.

### Loaders

- `loadEnv(path?)` — Loads a `.env` file into `process.env`. Defaults to `.env` in the working directory.
- `parseEnvFile(content)` — Parses a `.env` file string into a plain object without mutating `process.env`.
- `zodAdapter(schema)` — Adapts a Zod schema for use with `defineConfig`.

## License

MIT
