---
"@basenative/doppler": patch
---

Fix a file-system TOCTOU race (CodeQL `js/file-system-race`) in `bn doppler init`: the starter `doppler-required.json` write used an `existsSync` check followed by a separate write, which could silently clobber a file created in between. Now uses an exclusive create (`{ flag: 'wx' }`) and handles `EEXIST`. No user-visible behavior change.
