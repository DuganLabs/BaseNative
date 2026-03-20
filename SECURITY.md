# Security Policy

## Supported Line

Security fixes are applied to the current `main` branch while BaseNative remains in `v0.x`.

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
| XSS | Component render helpers escape HTML content and attributes; templates use {{ }} interpolation which is text-only |
| Insecure Dependencies | Runtime has zero dependencies; server depends only on `node-html-parser`; CI runs `pnpm audit` |
| Security Misconfiguration | CSP-compatible by design; no inline script generation |

## Dependency Audit

The CI pipeline includes `pnpm audit` to check for known vulnerabilities. The runtime package has **zero external dependencies**, minimizing the attack surface.

## CSP Policy Recommendation

When deploying BaseNative applications, use a strict Content Security Policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

BaseNative does not require `'unsafe-eval'` in your CSP policy.
