---
name: dl-cf-binding
description: Use this when the user wants to add a Cloudflare binding (D1, KV, R2, Durable Object, Queue, Service binding) to a project's wrangler.toml. Asks the binding type, name, and environment, runs the right `wrangler` create command if the resource doesn't exist, writes the toml fragment in the correct env block, and updates the runtime types (env.d.ts or types/cloudflare.d.ts). Expect: a wrangler.toml diff plus a one-line "verify with" command.
---

# DuganLabs Cloudflare Binding Helper

You add bindings to `wrangler.toml` correctly the first time — right env block, matching ID, types updated.

## When to invoke

User wants to:

- Add a D1 database
- Add a KV namespace
- Add an R2 bucket
- Add a Durable Object class
- Add a Queue (producer or consumer)
- Add a Service binding to another Worker

## Inputs (ask up front, all in one go)

1. **Binding type** — d1 / kv / r2 / do / queue / service.
2. **Binding name** — the JS identifier on `env`. Convention: SCREAMING_SNAKE (e.g. `DB`, `SESSIONS`, `UPLOADS`).
3. **Environment** — `dev` (top-level), `staging`, `production`. Often more than one.
4. **Resource name** — the underlying CF resource name. Default to `<repo>-<binding>-<env>` if they don't care.
5. **Already exists?** — yes/no/unknown. If unknown, run the list command.

## Workflow

1. Read existing `wrangler.toml`. Note the env structure already in use.
2. If resource doesn't exist, run the create command (you can use the cloudflare MCP tools if available, otherwise wrangler):
   - D1: `wrangler d1 create <name>` → capture `database_id`.
   - KV: `wrangler kv namespace create <name>` → capture `id`.
   - R2: `wrangler r2 bucket create <name>` (no ID — name is the binding).
   - DO: no create — declare in `[[durable_objects.bindings]]` and add migration.
   - Queue: `wrangler queues create <name>`.
3. Insert the toml fragment in the right block. Examples:

```toml
# D1
[[env.production.d1_databases]]
binding = "DB"
database_name = "myapp-db-prod"
database_id = "..."

# KV
[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = "..."

# R2
[[env.production.r2_buckets]]
binding = "UPLOADS"
bucket_name = "myapp-uploads-prod"

# DO
[[durable_objects.bindings]]
name = "ROOMS"
class_name = "Room"

[[migrations]]
tag = "v1"
new_classes = ["Room"]

# Service binding
[[env.production.services]]
binding = "AUTH"
service = "myapp-auth"
environment = "production"
```

4. Update types:
   - Run `wrangler types` if available, or
   - Manually edit `worker-configuration.d.ts` / `types/env.d.ts` to add the binding to `Env`.

5. Output the verify command:
   - D1: `wrangler d1 execute <name> --remote --command "SELECT 1"`
   - KV: `wrangler kv key put --binding=<NAME> __probe ok && wrangler kv key get --binding=<NAME> __probe`
   - R2: `wrangler r2 object put <bucket>/probe.txt --file=README.md`
   - DO: requires deploy + invoke; print the route to hit.

## Rules

- **Never invent IDs.** Run the create or list command to get them.
- **Match existing env structure** — if the project uses top-level + `[env.production]`, follow that. Don't introduce `[env.dev]` if the convention is top-level for dev.
- **Always update types.** A binding without types is a binding nobody will use.
- **Confirm before creating production resources.** "Create the bucket myapp-uploads-prod? y/n"

Built with BaseNative — basenative.dev
