# @basenative/mcp

MCP server exposing BaseNative to any agent, so a model can **check its output instead
of guessing**.

```bash
npx basenative-mcp        # stdio transport
```

Claude Code (`.mcp.json`):

```json
{
  "mcpServers": {
    "basenative": { "command": "npx", "args": ["-y", "basenative-mcp"] }
  }
}
```

## Tools

| Tool | Purpose |
|---|---|
| `validate_template` | Structured, repairable diagnostics for template markup |
| `render_preview` | SSR a template + context and return the HTML |
| `list_directives` | The directive reference, queryable — plus the forbidden-syntax map |
| `check_expression` | Is this expression inside the CSP-safe subset? |
| `scaffold_component` | Trinity Standard skeleton (state + logic + template in one file) |

## Why it exists

Without this, a model writing BaseNative guesses. Its failure mode is not invention
but **confident regression to the nearest neighbour** — emitting `v-if` because
BaseNative's syntax rhymes with Vue's, or Angular 17's `@if (cond) { }` block form
because `@if` is a real BaseNative directive name.

With this server, the model checks. `list_directives` answers "what is the exact
form" without a guess; `validate_template` catches the guess when it happens and
returns the corrected syntax; `render_preview` confirms the template does the thing.

## Design notes

`render_preview` **validates before it renders.** Rendering invalid markup does not
throw — it quietly produces something wrong, which is the exact failure this server
exists to prevent, so an invalid template returns diagnostics instead of HTML.

`scaffold_component` runs its own output through the validator and will not hand
back a skeleton that fails.

The server implements MCP's JSON-RPC 2.0 stdio protocol directly rather than
depending on an SDK, so the package keeps BaseNative's zero-production-dependency
constraint. Required arguments are enforced from each tool's `inputSchema` — a
missing argument returns an error rather than reaching a handler as `undefined`
and producing a confidently wrong answer.

## License

Apache-2.0
