# @basenative/evals

Measures whether models actually produce **correct** BaseNative — converting the
AI-legibility claim from marketing into a number anyone can check.

```bash
bn-evals --models anthropic:claude-opus-5,openai:gpt-5,google:gemini-2.5-pro --out results.md
```

## The corpus is hand-authored

`prompts/` and `fixtures/` are written by hand by the repo owner. No skill, no
subagent, and no model at any tier may generate them.

If a model writes the prompt, the reference implementation, *and* the assertion,
the eval measures that model's self-consistency and nothing else — a beautiful,
high, meaningless number. The harness therefore **refuses to run against an empty
corpus** rather than falling back to anything generated.

Assertion *types* are infrastructure and live in `src/assertions.js`. Assertion
*values* — what correct looks like — are yours.

## Pipeline

```
prompts/ (hand-authored) → model runner → generated template
    → @basenative/validate   does it parse?
    → @basenative/server     does it render?
    → @basenative/runtime    (stateful cases only) does it hydrate and react?
    → behavioural assertions does it do the thing?
    → score
```

The hydrate stage only runs for a case that declares `state` or a hydrate-family
assertion (`hydrated_contains`/`hydrated_excludes`/`after_set` — see
`prompts/README.md`) — most cases are fully scored by SSR output alone. When it
does run, it mounts the generated template — directives intact — into the same DOM
shim `@basenative/runtime`'s own tests use, and runs the real client `hydrate()`
against a context of real signals, which is the only way to score a signal,
computed, or effect rather than just a template's static shape.

Stages short-circuit: a template that does not parse cannot be meaningfully
rendered, so `failedAt` tells you *where* a model went wrong, not just that it did.

## The headline number

The suite runs twice per model — once with the BaseNative MCP tools offered, once
without. The delta is the product claim: does giving a model a validator actually
make it write correct BaseNative?

The two prompts differ **only** by one sentence naming the tools. Anything more
would confound "has tools" with "was told more about the language".

Alongside pass rate, the report tracks **drift rate** — how often a model reached
for another framework's syntax rather than merely getting the logic wrong. That is
the number that tests the thesis, and it is reported even when it embarrasses it.

## Multi-provider by design

A leaderboard that only tests Claude is marketing, not evidence. `resolveCredentials`
lists **every** provider whose key is missing and refuses to start, rather than
quietly producing a table with three models silently absent.

Providers: `anthropic`, `openai`, `google`, `openaiCompatible` (any OpenAI-shaped
endpoint, for open-weight models), `ollama` (local models via
[Ollama](https://ollama.com), no API key required).

**Local models are the intended path for the non-Anthropic side of the leaderboard.**
Cloud model APIs are separately billed, and this project runs on hardware the owner
already has rather than buying keys. Run open-weight models locally with Ollama:

```bash
ollama pull llama3.2
ollama pull qwen2.5-coder
bn-evals --models anthropic:claude-opus-5,ollama:llama3.2,ollama:qwen2.5-coder
```

`ollama` models default to `http://localhost:11434`; override with `--ollama-url` if
Ollama runs elsewhere. Before running, `bn-evals` checks `/api/tags` on that endpoint
and fails loudly — printing the exact `ollama pull <model>` command — for any requested
model that hasn't been pulled yet, rather than burning a run on a typo.

`resolveCredentials` never treats a local model as a missing credential: `ollama` needs
no key at all, and pointing `openaiCompatible` at a `localhost` `baseUrl` (Ollama's
OpenAI-compatible `/v1` endpoint, LM Studio, etc.) waives the key requirement too. Cloud
providers are unaffected — a missing cloud key still refuses the run.

> **Note:** running the suite against a cloud provider requires an API key for it. A
> Claude Max/Pro subscription does not include API access — these are separately billed.
