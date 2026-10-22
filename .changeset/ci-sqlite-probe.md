---
'@basenative/db': patch
---

Refuse to load better-sqlite3 when its engines field excludes this Node. Version 13 requires Node >= 22; on Node 20 the import succeeds and `new Database()` SIGSEGV's (CI runs 39805077689 and 39806233360). An import-only child probe reported success, so the probe now opens a database before the parent constructs one.
