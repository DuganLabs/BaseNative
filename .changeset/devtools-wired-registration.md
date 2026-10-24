---
'@basenative/runtime': patch
---

Wire the devtools hooks into the runtime. `signal()`, `computed()`, and `effect()` now register with `enableDevtools()` as they are created — live values, subscriber counts, and disposal state — and `hydrate()` appends each run to the hydration timeline. Previously the registry only filled when user code called `trackSignal`/`trackEffect`/`recordHydration` by hand, so the documented enable-then-inspect flow reported an empty state. Manual track calls now relabel an existing registration instead of duplicating it.
