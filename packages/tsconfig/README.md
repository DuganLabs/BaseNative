# @basenative/tsconfig

Shared base tsconfigs for DuganLabs projects. Strict, modern, runtime-targeted.

## Install

```bash
pnpm add -D @basenative/tsconfig
```

## Use

Pick the variant matching your runtime in `tsconfig.json`:

```json
{ "extends": "@basenative/tsconfig/base" }
```

```json
{ "extends": "@basenative/tsconfig/browser" }
```

```json
{ "extends": "@basenative/tsconfig/node" }
```

```json
{ "extends": "@basenative/tsconfig/worker" }
```

```json
{ "extends": "@basenative/tsconfig/react" }
```

Then add your own `include` / `exclude` and any project-specific overrides.

## What's in `base`

- `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`
- `strict: true` plus the modern strictness extras: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`
- `verbatimModuleSyntax`, `isolatedModules`, `esModuleInterop`
- `allowJs: true` (DuganLabs projects mix JS + TS)
- `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`

## License

Apache-2.0
