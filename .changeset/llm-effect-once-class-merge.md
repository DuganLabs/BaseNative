---
'@basenative/runtime': patch
'@basenative/server': patch
'@basenative/validate': patch
'@basenative/cli': patch
---

Effects settle once per write. A `set()` queues subscribers, runs derived computeds until the graph settles, then runs each user effect once. An effect that writes a signal it also read throws `BN_EFFECT_LOOP` and tells the caller to use `.peek()` or write a different signal.

`class` and `:class` merge. `mergeClass()` is shared by `render()` and `hydrate()`, so `class="item" :class="done() ? 'done' : ''"` keeps both tokens. A false or null binding adds nothing.

`@basenative/validate` reports React habits (`className`, `htmlFor`, `onClick`, `dangerouslySetInnerHTML`, and `{expr}` text) with the BaseNative replacement. `bn from-jsx` applies the same translation to a draft file.
