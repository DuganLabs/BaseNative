# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x (current) | ✓ |
| < 0.3.0 | ✗ |

Security fixes are applied to the current `main` branch. Once v1.0 ships, the latest minor will receive security patches.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately via [GitHub Security Advisories](https://github.com/DuganLabs/BaseNative/security/advisories/new) or email the maintainers directly.

## Reporting

Please report security issues privately to the maintainers before opening a public issue.

Include:

- affected package or file
- reproduction details
- impact assessment
- proposed mitigation if known

## Security Posture

Current priorities:

- no eval-like sinks in shipped runtime/server code
- explicit browser support and fallback policy
- honest documentation for partial hydration behavior

## CSP-Safe Architecture

BaseNative's expression engine (`src/shared/expression.js`) is designed to be Content Security Policy safe:

- **No `eval()`** — expressions are parsed into an AST and interpreted
- **No `new Function()`** — no dynamic code generation
- **No `setTimeout(string)`** — no string-to-code conversion
- **Blocked properties** — `__proto__`, `prototype`, and `constructor` access is forbidden in expressions
- **Automated verification** — `packages/runtime/src/csp.test.js` scans all shipped code for eval-like patterns

## OWASP Considerations

| Risk | Mitigation |
|------|-----------|
| Injection (A03) | Expression interpreter blocks arbitrary code execution; safe member access prevents prototype pollution |
| XSS | `{{ }}` interpolation and `:attr` bindings are HTML-escaped on both the server and the client; URL-bearing attributes additionally reject executable schemes. Opt out per value with `raw()` |
| Insecure Dependencies | Runtime has zero dependencies; server depends only on `node-html-parser`; CI runs `pnpm audit` |
| Security Misconfiguration | CSP-compatible by design; no inline script generation |

## Output Escaping

`@basenative/server`'s `render()` and the client's attribute/text binding both escape
interpolated **values**. Static template markup is never escaped — only substituted data.

- Text position: `&`, `<`, `>`
- Attribute position: additionally `"`
- URL-bearing attributes (`href`, `src`, `action`, `formaction`, `poster`, …): values
  whose scheme is `javascript:`, `vbscript:`, `data:`, `blob:` or `file:` are dropped and
  reported as the `BN_UNSAFE_URL` diagnostic. Whitespace and control characters are
  stripped before that test, because browsers ignore them when resolving a URL.

Both sides share `@basenative/runtime/shared/escape`. That is deliberate: escaping used
to exist on neither side, and the client's use of `textContent` meant hydration silently
rewrote an injected payload as text *after* it had executed — the server and client
disagreeing is the failure mode this module exists to prevent.

### Opting out

```js
import { raw } from '@basenative/runtime';

render('<div>{{ body }}</div>', { body: raw('<em>trusted</em>') });
```

`raw()` is a trust assertion about one specific value. It is a function call rather than
a template directive or a config flag so that every exemption is greppable:

```bash
grep -rn "raw(" src/
```

Marking one value raw does not affect its neighbours — other substitutions in the same
text node are still escaped. `raw()` does **not** exempt a value from the URL scheme
guard: a `javascript:` URL is never emitted, because an author asking for trusted markup
is not asking for script execution.

Never pass unvalidated user input to `raw()`.

## Dependency Audit

The CI pipeline includes `pnpm audit` to check for known vulnerabilities. The runtime package has **zero external dependencies**, minimizing the attack surface.

## CSP Policy Recommendation

When deploying BaseNative applications, use a strict Content Security Policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

BaseNative does not require `'unsafe-eval'` in your CSP policy.
