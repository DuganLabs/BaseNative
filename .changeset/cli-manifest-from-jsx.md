---
'@basenative/cli': patch
---

The CLI manifest now enumerates `from-jsx`. The manifest is documented as the machine-readable enumeration of every command, but the JSX translator — registered in the dispatcher and printed in `bn --help` — was missing from it, so shell completion and any tooling reading the manifest did not know the command exists. A test now asserts the manifest and the dispatcher's command map cannot drift apart again.
