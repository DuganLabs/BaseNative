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
