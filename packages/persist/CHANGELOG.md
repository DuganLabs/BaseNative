# Changelog — @basenative/persist

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: signal-driven local persistence with TTL envelopes, pluggable storage (localStorage / indexedDB / memory), bidirectional `persisted(key, signal)` bind, and a server-rehydrate hook with conflict reconciliation.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0

## 0.1.0 — initial release

- `loadPersisted` / `savePersisted` / `clearPersisted` / `persistedSavedAt` — flat KV API with TTL envelope
- `persisted(key, signal)` — bidirectional signal/storage bind
- `hydrateFromServer({ key, fetch, onResolve, reconcile })` — local + server reconcile
- Pluggable storage: `localStorage`, `indexedDB`, `memory`
- Reads t4bs legacy `{...state, savedAt}` shape with 12h default expiry
