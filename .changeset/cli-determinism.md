---
'@basenative/cli': patch
---

Generated artifacts are now deterministic — same inputs, same output. `bn create` takes its Cloudflare compatibility date from a new `--compat-date` option (default: the pinned @basenative/wrangler-preset baseline, 2025-09-23) instead of the wall clock. `bn prd init` no longer embeds $USER or the date (owner is `--owner` or TBD), and the `generated_at` timestamp is gone from `bn prd sync` and `bn speckit tasks` output; speckit spec scaffolds no longer stamp $USER as owner. Template and directory walks are sorted, so file order no longer depends on the filesystem.
