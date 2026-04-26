# Changelog — @basenative/persist

## 0.1.0 — initial release

- `loadPersisted` / `savePersisted` / `clearPersisted` / `persistedSavedAt` — flat KV API with TTL envelope
- `persisted(key, signal)` — bidirectional signal/storage bind
- `hydrateFromServer({ key, fetch, onResolve, reconcile })` — local + server reconcile
- Pluggable storage: `localStorage`, `indexedDB`, `memory`
- Reads t4bs legacy `{...state, savedAt}` shape with 12h default expiry
