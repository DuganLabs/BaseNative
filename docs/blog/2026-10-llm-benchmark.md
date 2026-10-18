# I benchmarked my own framework against React, with LLMs doing the writing

*October 2026*

I built BaseNative, a signals-based JavaScript framework with HTML templates, SSR, and hydration. It has no build step and no JSX. Templates are plain HTML with directives like `<template @if="...">`, and template expressions run through a hand-written parser, so there is no `eval` anywhere in the runtime and the whole thing works under a strict CSP.

The obvious problem: nobody reaches for it. Developers default to React, and LLMs default to React harder, because React is most of what they were trained on. I wanted to know whether that default is costing anything measurable when an LLM does the writing, so I ran the comparison instead of arguing about it. Two experiments, both from October 2026. Every number below comes out of test runs, and the full iteration log exists for anyone who wants to check my work.

## Experiment 1: same author, both frameworks

An LLM wrote the same two apps twice, once in BaseNative (0.6.4) and once in React (19.3.1), on Node 24. One shared dataset, identical behavior tests on both sides, every fix logged. The tasks were a server-rendered catalog page and an interactive page with a counter, a computed doubled value, an effect log, a batch update that has to log exactly once, and an add/clear list.

Both implementations passed everything: 4/4 tests each. The differences showed up in what it took to get there.

| | BaseNative | React |
|---|---|---|
| Hand-written lines (both tasks) | 95 | 114 |
| Approx. code tokens (bytes ÷ 4) | 827 | 795 |
| Build step | None | esbuild |
| Build/tooling fixes before tests passed | 0 | 4 |
| App-code bugs | 1 | 0 |
| Production dependencies (interactive task) | 1 | 3 |

The four React fixes were all framework knowledge, not app logic. `renderToString` inserts `<!-- -->` between text nodes, so a price renders as `$<!-- -->49` and the shared assertion needs a normalization step. Node 24 has a getter-only `navigator` global that broke the jsdom setup. React 19 schedules mount effects asynchronously, so the test had to wait inside `act()` before asserting on the log, where BaseNative's effects are synchronous and assertions land immediately after a click. Bundling `react-dom/server` to ESM failed on a dynamic require and took an esbuild config change to fix. The React tests also need two tricks the BaseNative tests do not: wrapping clicks in `act()`, and setting input values through the native prototype setter because React's value tracking ignores a direct `.value` assignment.

The size comparison cuts the other way, and I am reporting it the way it came out. BaseNative used 17% fewer lines and still used about 4% more tokens, because HTML closing tags and longer template lines cost more than JSX per line. My hypothesis going in was that BaseNative code would be smaller. It was not. There is a corollary I had also assumed: I ship a 2,590-token `llms.txt` that teaches a model the whole API, and I figured smaller code would pay that back over a few tasks. At −16 tokens per task on average, it never pays back. The file earns its keep a different way, which experiment 2 gets to.

Dependency weight is the one lopsided number. The interactive React app, bundled unminified with esbuild defaults, was 1,181,977 bytes. The entire BaseNative runtime source tree is 77,071 bytes, and it has zero dependencies. Treat that as an order-of-magnitude signal rather than a production bundle comparison, but the direction is not subtle.

The single app-code bug in the run belonged to BaseNative. An effect that read both a signal and a computed derived from that signal fired twice per change. The fix is to subscribe to the computed and read the source with `.peek()`. React's app code needed no fixes at all. The model writing the code has written a million React counters and about zero BaseNative ones, and it showed exactly where you would expect.

## Experiment 2: three LLMs, one prompt, no author loyalty

A day later, after BaseNative 2.0.0 shipped to npm, I gave three different LLMs the same prompt: build a reading-list app as a single HTML file, runtime loaded from a CDN script tag, docs bundle linked, a cheat sheet in the prompt covering the syntax and the known traps. Then I ran what they sent back in a jsdom harness against the real published runtime, clicking through every feature.

The first model returned a complete file and a confident report saying every feature was verified. Execution disagreed. Adding or deleting a book flooded the activity log with duplicate lines until it hit the model's own 20-line cap. The cause was the diamond trap's less famous sibling: its logging effect called a helper that read the log signal, which subscribed the effect to the very signal it wrote, so each write re-triggered it synchronously. Run against the bare runtime with no DOM, the same pattern is a stack overflow. Its styling was also silently broken, because a `:class` binding replaces the element's class attribute instead of merging with it, a fact none of the three models knew for sure.

The second model could not execute its file and said so in plain language. Its two uncertain design calls both turned out to be right: it kept its logging effect subscribed to one signal and pulled message text through `.peek()`, and it wrote full class strings into its `:class` bindings in case the binding replaced rather than merged. The third model sent a feature table with "code inspected" in every verification cell and no file I could run.

I merged the three into one file, keeping the first model's app, the second model's logging design, and full class strings in the bindings. It passes an 18-check journey (add, toggle, all three filters, mark all read, delete, exact log counts at each step) with zero page errors.

## What the experiments changed

Three rules went into the BaseNative docs, because models kept needing them and the syntax cheat sheet was not enough. Reading a signal inside an effect subscribes the effect, including reads that happen inside helper functions. An effect must never read a signal it also writes; take the current value with `.peek()` instead. And `:class` replaces the class attribute, so static classes belong inside the binding.

The trial also found a real defect in my framework. `:value` bindings wrote the value attribute, which is a field's default, not its current value, so clearing a signal after a form submit left the typed text on screen. Every LLM that touched the app wrote the naive pattern and hit it. That is fixed in 2.0.1: the binding now mirrors `value` and `checked` onto the element properties, with regression tests, shipped through the same release pipeline as everything else. All 45 packages are at 2.0.1 on npm.

## Limits of all this

Two small tasks and one app are not a field study. Token counts are bytes divided by four, applied the same way to both sides. Experiment 1 had one author, an LLM with far more React in its training, which is the condition I wanted to measure and also a reason a different model would produce different fix counts. Routing, forms packages, auth, and the database adapters went unbenchmarked. If the tasks had been a large multi-page app, component reuse might have moved the code-size numbers in either direction. I do not know, and I am not going to pretend a counter page settles it.

What I can say from the data: an LLM writes working BaseNative faster than working React when the docs are in front of it, measured in setup steps, tooling fixes, and test determinism, and it writes about the same amount of code either way. The framework's job is to keep shrinking the first list. The docs rules and the 2.0.1 fix both came straight out of watching models use the thing, which is probably how frameworks are going to get designed from here on.

*Update, later on October 18: the head-to-head above ran against BaseNative 0.6.4, because npm publishing landed after the run. I re-ran the identical benchmark against the published 2.0.1 packages — same app code, same tests, same measurement script — and every measured value came out the same: both suites passing, identical line and token counts, dependency closures unchanged, the React bundle byte-identical at 1,181,977 bytes. The repo record (`benchmarks/llm/`) now holds the 2.0.1 run.*
