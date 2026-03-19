# Contributing

## Scope

BaseNative is still in `v0.x`. Contributions should favor:

- security and correctness
- semantic HTML defaults
- native platform primitives before custom ARIA composites
- honest documentation over aspirational marketing

## Development Priorities

1. Trust blockers
2. Runtime/server correctness
3. Browser support and accessibility
4. Core semantic primitives
5. Broader framework surface

## Standards

- Do not introduce eval-like APIs.
- Do not oversell partial features in code comments or docs.
- Prefer named functions in templates over increasingly dynamic inline expressions.
- Prefer native elements when the platform already provides the semantics.

## Pull Requests

- Include tests when changing runtime or server behavior.
- Call out browser support implications explicitly.
- Document any new public behavior or limitation in the repo docs.
