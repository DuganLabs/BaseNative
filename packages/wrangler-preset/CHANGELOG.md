# @basenative/wrangler-preset

## 0.2.1

### Patch Changes

- 1bfd837: Fix a polynomial ReDoS surface (CodeQL `js/polynomial-redos`) in `toToml`: trailing newlines were stripped with `/\n+$/`, which backtracks quadratically on input with many newlines, and the input can come from config values outside this module's control. Replaced with a linear index scan; output is unchanged.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: pinned Wrangler version + typed `wrangler.toml` fragment generator. Ships baseline defaults, binding fragment builders (D1/KV/R2/DO), a zero-dep TOML serializer, a `bn-wrangler` CLI wrapper, and a starter template — pin once, every project moves together.

## 0.1.0

- Initial release.
- Pin `wrangler` at `^4.85.0` as a transitive dependency.
- `defaults` baseline (`compatibility_date`, `compatibility_flags`, `pages_build_output_dir`).
- Fragment builders: `bindings.d1`, `bindings.kv`, `bindings.r2`, `bindings.do`.
- `mergeWrangler(base, ...frags)` deep-merge with array concatenation.
- `toToml(config)` zero-dependency TOML serializer.
- `bn-wrangler` CLI wrapper that re-execs the pinned wrangler.
- Starter `templates/wrangler.toml.tmpl`.
