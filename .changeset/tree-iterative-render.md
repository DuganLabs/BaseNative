---
'@basenative/components': patch
---

Tree and TreeGrid no longer overflow the call stack on deeply nested input. The shared node walk (`renderNodes`) rendered children by recursion and threw `RangeError: Maximum call stack size exceeded` at roughly 3,000 levels of nesting; it now walks with an explicit stack, producing byte-identical markup for ordinary inputs while depth is bounded by memory instead (verified to 100,000 levels). Regression coverage pins the exact pre-fix output for a mixed expanded/collapsed tree and a tree grid, plus the pathological-depth cases.
