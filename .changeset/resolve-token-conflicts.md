---
'@basenative/components': minor
'@basenative/theme': minor
---

Resolve every open token conflict in DESIGN.md. The amber `--color-tint` family
replaces the blue primary ramp: `--palette-primary-*` and
`--color-text-on-primary` become deprecated aliases of the tint tokens. Controls
use one 2.25 / 2.75 / 3.25rem ladder on every pointer: new `--size-control-sm`,
and `--size-control-height-sm/-/-lg` become deprecated aliases (the theme's
control-height defaults follow). Small buttons keep a 44px hit area. The other
conflicting names keep their live values and are marked `$deprecated` or
documented as separate roles. Deprecated names are removed next minor.
