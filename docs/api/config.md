# @basenative/config

> Type-safe environment configuration with built-in validators and Zod support.

## Overview

`@basenative/config` loads environment variables and validates them against a schema at startup, throwing a descriptive error listing every invalid key before the application proceeds. It ships built-in validators for common types (`string`, `number`, `boolean`, `oneOf`, `optional`) and a `zodAdapter` for teams that prefer Zod schemas. An `env` prefix option strips a shared prefix from all variable names.

## Installation

```bash
npm install @basenative/config
```

## Quick Start

```js
import { defineConfig, string, number, boolean, oneOf, optional } from '@basenative/config';

const config = defineConfig({
  schema: {
    PORT: optional(number({ min: 1, max: 65535 }), 3000),
    DATABASE_URL: string(),
    NODE_ENV: oneOf(['development', 'staging', 'production']),
    DEBUG: optional(boolean(), false),
  },
});

console.log(config.PORT);        // 3000 (number)
console.log(config.DATABASE_URL); // validated string
```

## API Reference

### defineConfig(options)

Loads and validates configuration from environment variables.

**Parameters:**
- `options.schema` — schema definition: either a key-to-validator map or a function (from `zodAdapter`)
- `options.env` — source of environment variables; default `process.env`
- `options.prefix` — strip this prefix from all variable names before matching schema keys (e.g. `'APP_'`)

**Returns:** Validated configuration object with keys matching the schema.

**Throws:** `Error` listing all validation failures if any key fails validation.

**Example with prefix:**
```js
// Reads APP_PORT, APP_DATABASE_URL from process.env
const config = defineConfig({
  prefix: 'APP_',
  schema: {
    port: number(),
    database_url: string(),
  },
});
```

---

### string(options)

Validator that expects a non-empty string.

**Parameters:**
- `options.minLength` — minimum string length
- `options.maxLength` — maximum string length

**Returns:** Validator function.

---

### number(options)

Validator that coerces the value to a number.

**Parameters:**
- `options.min` — minimum value (inclusive)
- `options.max` — maximum value (inclusive)

**Returns:** Validator function. The parsed value in the config object will be a `number`.

---

### boolean()

Validator that accepts `'true'`, `'1'`, `true`, `'false'`, `'0'`, or `false`.

**Returns:** Validator function. The parsed value will be a `boolean`.

---

### oneOf(allowed)

Validator that enforces the value is one of the given strings.

**Parameters:**
- `allowed` — array of allowed string values

**Returns:** Validator function.

**Example:**
```js
NODE_ENV: oneOf(['development', 'production']),
```

---

### optional(validator, defaultValue)

Wraps any validator to make the key optional. Returns `defaultValue` when the variable is absent or empty.

**Parameters:**
- `validator` — any validator function
- `defaultValue` — value to use when the variable is absent

**Returns:** Validator function.

---

### validateConfig(values, schema)

Validates a plain object against a schema map. Throws on any failures.

**Parameters:**
- `values` — object of raw string values
- `schema` — key-to-validator map

**Returns:** Validated config object.

---

### zodAdapter(zodSchema)

Wraps a Zod schema for use as the `schema` option in `defineConfig`.

**Parameters:**
- `zodSchema` — a Zod schema object (any schema with `.safeParse`)

**Returns:** Function compatible with `defineConfig`'s `schema` option.

**Example:**
```js
import { z } from 'zod';
import { defineConfig, zodAdapter } from '@basenative/config';

const config = defineConfig({
  schema: zodAdapter(z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
  })),
});
```

---

### loadEnv(path)

Loads a `.env` file and merges it into `process.env`. Variables already set in the environment are not overwritten.

**Parameters:**
- `path` — path to the `.env` file; default `'.env'`

---

### parseEnvFile(content)

Parses `.env` file content into a plain object without modifying `process.env`.

**Parameters:**
- `content` — string content of a `.env` file

**Returns:** `Record<string, string>`

## Integration

Call `loadEnv()` before `defineConfig()` in development. In production, environment variables should already be set by the deployment platform.

```js
import { loadEnv, defineConfig, string, number } from '@basenative/config';

loadEnv(); // no-op in production if file is absent

export const config = defineConfig({
  schema: {
    PORT: number(),
    DATABASE_URL: string(),
    SESSION_SECRET: string({ minLength: 32 }),
  },
});
```
