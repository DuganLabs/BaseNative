# @basenative/wrangler-preset

## 0.1.0

- Initial release.
- Pin `wrangler` at `^4.85.0` as a transitive dependency.
- `defaults` baseline (`compatibility_date`, `compatibility_flags`, `pages_build_output_dir`).
- Fragment builders: `bindings.d1`, `bindings.kv`, `bindings.r2`, `bindings.do`.
- `mergeWrangler(base, ...frags)` deep-merge with array concatenation.
- `toToml(config)` zero-dependency TOML serializer.
- `bn-wrangler` CLI wrapper that re-execs the pinned wrangler.
- Starter `templates/wrangler.toml.tmpl`.
