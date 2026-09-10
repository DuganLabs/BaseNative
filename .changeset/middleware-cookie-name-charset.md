---
"@basenative/middleware": patch
---

The Express adapter's cookie parser now only accepts RFC 6265 token characters in cookie names; names containing separators, spaces or control characters are dropped instead of becoming properties.
