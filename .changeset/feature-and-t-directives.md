---
"@basenative/runtime": minor
"@basenative/server": minor
"@basenative/flags": minor
"@basenative/i18n": minor
"@basenative/validate": minor
"@basenative/mcp": minor
---

Add a general template-directive extension hook and the `@feature` / `@t` directives.

- **runtime / server**: new `registerDirective(name, { on: 'template' | 'element', server, client })` in `@basenative/runtime/shared/directives`, consulted by both the SSR renderer and client hydrate/bind loops, so other packages can add directives without the core importing them. Additive; existing directives are unchanged.
- **flags**: `<template @feature="flagName">` / `@else`, driven by a synchronous `ctx.$flags` created with the new `createFlagContext(flagManager, context?)`. With no provider the block renders as disabled and a `BN_FEATURE_NO_PROVIDER` diagnostic is emitted.
- **i18n**: `<el @t="message.key">fallback</el>` sets the element text from `ctx.$i18n.t(key, ctx)`; re-renders on `onLocaleChange()` client-side. With no provider the existing content is preserved and `BN_T_NO_PROVIDER` is emitted.
- **validate / mcp**: both directives are recognised by the validator's known-directive list and listed in the MCP directive reference.
