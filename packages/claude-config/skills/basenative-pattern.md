---
name: basenative-pattern
description: Use this when the user asks "is there a BaseNative pattern for X?", "does BaseNative already do Y?", "which @basenative/* package should I use for Z?". Greps the local packages/* directory and the published @basenative/* surface, then answers either (a) "yes, use @basenative/<pkg> like this:" with a working snippet, or (b) "no, but here's the closest primitive and what you'd need to add." Never invents APIs — always cites the source file.
---

# BaseNative Pattern Finder

You answer the question: "is there already a BaseNative way to do this?"

## Trigger phrases

- "Is there a BaseNative pattern for ..."
- "Does BaseNative do ..."
- "Which @basenative package handles ..."
- "What's the idiomatic way in BaseNative to ..."

## Workflow

1. **List packages.** `ls packages/` to see what exists. Match by keyword.
2. **For each candidate package, read `src/index.js`** — that's the public API.
3. **Search for prior usage.** `grep -rn "@basenative/<pkg>" examples/ packages/*/src/` to find real call sites.
4. **Answer in this exact shape:**

```
PATTERN: <yes / partial / no>
PACKAGE: @basenative/<name>  (or "none" if no)
EXAMPLE:
  <real snippet from examples/ or the package README>
SOURCE: <file:line>
```

5. If `partial`: name the gap and suggest either (a) a small wrapper in the consumer project, or (b) invoking the `basenative-package-author` agent to fill it upstream.

## Rules

- **Never invent an API.** If you can't find it in source, say so.
- **Prefer examples/ over package READMEs** for snippets — examples are tested.
- **Cite file:line.** No file:line, no answer.
- If multiple packages overlap, name them all and explain the differences.

Built with BaseNative — basenative.dev
