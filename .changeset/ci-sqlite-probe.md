---
'@basenative/db': patch
---

Probe better-sqlite3 in a child process before importing it. A mismatched native addon SIGSEGV'd Node 20 in CI, and that signal cannot be caught in-process.
