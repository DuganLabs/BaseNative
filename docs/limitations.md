# Limitations

BaseNative is not feature-complete yet.

Current limitations:

- no router package
- no forms package
- no validation adapters
- no packaged component library
- no full SSR DOM-reuse hydration story yet
- no devtools

Template expressions intentionally support a safe subset of JavaScript-like syntax. They are not intended to run arbitrary program text.

If a UI requires complex logic, move that logic into named functions in your script and call those functions from the template.
