# @basenative/doppler

> Thin developer-experience layer around Doppler — local-dev wrapper, CI helper, project bootstrap, and environment validation.

## Overview

`@basenative/doppler` is plumbing around the [Doppler](https://www.doppler.com/) secrets manager and its `doppler` CLI — it never stores, generates, or embeds any secret value itself. `dopplerRun` and `requireSecrets` wrap the CLI invocations and env-var checks a project's local-dev and CI scripts would otherwise hand-roll; `injectIntoWrangler` reshapes an already-resolved env object into the `{ vars, secrets }` split Cloudflare Wrangler expects; and the `./required` subpath (`loadRequired`, `validateRequired`, `findMissing`) parses and validates a project's own `doppler-required.json` manifest — a list of secret *names* the project expects to exist, never their values. The package also ships a `bn-doppler` CLI binary (`init`, `verify`, `ci-token`, `run`) built on top of these same exports, for interactive/CI use outside of a Node script.

## Installation

```bash
npm install @basenative/doppler
```

## Quick Start

```js
import { dopplerRun, requireSecrets, injectIntoWrangler } from '@basenative/doppler';

// Run a command with Doppler-injected env vars, same as `doppler run -- <cmd>`
await dopplerRun(['node', 'server.js'], { project: 'my-app', config: 'dev' });

// Fail fast at boot if required secrets aren't present in process.env
await requireSecrets(['DATABASE_URL', 'STRIPE_SECRET_KEY']);

// Reshape resolved env vars for a `wrangler.toml` deploy step
const { vars, secrets } = injectIntoWrangler({
  names: ['API_BASE_URL', 'STRIPE_SECRET_KEY'],
});
```

```js
import { loadRequired, findMissing } from '@basenative/doppler/required';

const schema = loadRequired('./doppler-required.json');
const missing = findMissing(schema, process.env);
if (missing.length > 0) {
  throw new Error(`Missing secrets: ${missing.join(', ')}`);
}
```

## API Reference

### dopplerRun(args, opts = {})

Wraps `doppler run -- <args...>` so callers don't have to remember the incantation. Spawns the `doppler` CLI as a child process (`shell: false`) and resolves once it exits.

**Parameters:**
- `args` — argv array for the wrapped command, e.g. `['node', 'server.js']`
- `opts.project` — passed as `--project`
- `opts.config` — passed as `--config` (e.g. `dev`/`prep`/`prod`)
- `opts.preserveEnv` — passes `--preserve-env` to doppler
- `opts.cwd` — working directory for the child process
- `opts.env` — env vars passed to the child; defaults to `process.env`
- `opts.inherit` — inherit stdio when `true` (default); pipes stdio when `false`

**Returns:** `Promise<{ code: number, signal: NodeJS.Signals | null }>` — resolves with the child's exit code and signal. Rejects with a descriptive error if the `doppler` binary isn't on `PATH`.

---

### requireSecrets(names, opts = {})

Validates that the named secrets exist and are non-empty. By default, checks `process.env` — the intended use is at app boot, after `doppler run` has already injected env vars. Pass `{ source: 'doppler' }` to instead fetch current values via `doppler secrets download` rather than trusting `process.env`.

**Parameters:**
- `names` — non-empty array of secret name strings; throws a `TypeError` if empty or not an array
- `opts.source` — `'env'` (default) or `'doppler'`
- `opts.project` — `--project` flag, used only when `source: 'doppler'`
- `opts.config` — `--config` flag, used only when `source: 'doppler'`

**Returns:** `Promise<Record<string, string>>` — the requested names mapped to their resolved values. Throws `MissingSecretsError` if any are missing or empty.

---

### injectIntoWrangler({ env = process.env, names, secretNames })

Moves Doppler-resolved values out of an arbitrary env object and into the shape Wrangler expects for a deploy. Names whose value looks like a secret — by name pattern (`*_TOKEN`, `*_KEY`, `*_SECRET`, `*_PASSWORD`, `*_PASS`, `*_PWD`, `*_API_KEY`, `*_PRIVATE`, or a `SECRET_`/`PRIVATE_` prefix) or by looking like random token material (32+ characters of base64/URL-safe-ish characters) — are routed to `secrets`; everything else goes to `vars`. Callers can bypass the heuristic entirely by passing `secretNames` explicitly.

**Parameters:**
- `env` — source object to read values from; defaults to `process.env`
- `names` — array of names to extract; throws a `TypeError` if not an array
- `secretNames` — optional array of names to force into `secrets` regardless of the heuristic

**Returns:** `{ vars: Record<string,string>, secrets: Record<string,string> }` — `vars` is non-secret name/value pairs suitable for `[vars]` in `wrangler.toml`; `secrets` is secret names paired with their resolved values, suitable for piping into `wrangler secret put`. Throws `MissingSecretsError` if any requested name is undefined or empty in `env`.

---

### MissingSecretsError

Error class thrown by `requireSecrets` and `injectIntoWrangler` when one or more requested secret names are missing or empty. Carries `.missing` (the array of missing names) and `.code = 'E_MISSING_SECRETS'`; its message points the user at `doppler secrets set <NAME>`, the Doppler dashboard, and `bn-doppler verify`.

---

### loadRequired(filePath)

Parse and validate a `doppler-required.json` file from disk (via the `./required` subpath export). Throws if the file doesn't exist, isn't valid JSON, or fails `validateRequired`'s shape checks.

**Parameters:**
- `filePath` — absolute or cwd-relative path to the manifest file

**Returns:** `{ secrets: RequiredSecret[], configs: string[] }` (a `RequiredSchema`).

---

### validateRequired(input)

Validates the shape of an already-parsed `doppler-required.json` object: `secrets` must be an array of `{ name, description?, required? }` objects, where `name` is a non-empty, unique, `SCREAMING_SNAKE_CASE` string; `configs` must be an array of unique strings, each one of `dev`, `prep`, `preview`, `staging`, `prod`, or `production`. `required` defaults to `true` when omitted.

**Parameters:**
- `input` — the parsed manifest value to validate

**Returns:** the same object, normalized to `{ secrets, configs }`. Throws `ValidationError` (with every violation collected, not just the first) if `input` isn't an object, or if any field fails the checks above.

---

### findMissing(schema, env)

Returns the names of secrets declared in `schema` that are missing (undefined or empty string) from `env`. Secrets marked `required: false` are ignored.

**Parameters:**
- `schema` — a `RequiredSchema`, as returned by `loadRequired`/`validateRequired`
- `env` — object to check against, e.g. `process.env`

**Returns:** `string[]` — names of missing required secrets (empty array if none are missing).

---

### ValidationError

Error class thrown by `validateRequired` (and, transitively, `loadRequired`) when a `doppler-required.json` manifest fails validation. Carries `.errors` (array of individual violation strings) and `.code = 'E_INVALID_REQUIRED'`; its message lists every violation on its own line.

## Integration

The `bn-doppler` CLI (installed as a `bin` entry) is a thin shell over these same exports: `bn-doppler run -- <cmd>` calls `dopplerRun`, and `bn-doppler verify` calls `loadRequired` + `findMissing` against `./doppler-required.json` (or a path given via `--required`) to report missing secrets before a deploy or local session starts. Because this package only ever moves *names* and already-resolved values it's handed — it does not fetch, cache, or embed secret material of its own — it's safe to depend on from build tooling and CI scripts without expanding what has access to real secret values.

## License

Apache-2.0
