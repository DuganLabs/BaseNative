---
"@basenative/cli": patch
---

Fix file-system TOCTOU races (CodeQL `js/file-system-race`) in `bn generate`, `bn prd init`, `bn speckit plan/tasks`, and the template renderer used by scaffolding commands: an `existsSync` check followed by a separate read/write let a file created in between the two calls be silently overwritten. Writes that must not clobber an existing file now use an exclusive create (`{ flag: 'wx' }`) and handle `EEXIST` instead, which is atomic. No user-visible behavior change.
