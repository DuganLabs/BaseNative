# @basenative/doppler

## 0.1.0

- Initial release.
- `dopplerRun(args, opts)` programmatic wrapper around `doppler run --`.
- `requireSecrets(names, opts)` boot-time validator with `MissingSecretsError`.
- `injectIntoWrangler({ env, names, secretNames })` splits resolved values into
  Wrangler `vars` vs `secrets`.
- `loadRequired` / `validateRequired` / `findMissing` for `doppler-required.json`.
- `bn-doppler init <project>` interactive bootstrap.
- `bn-doppler verify` checks `doppler-required.json` against a Doppler config.
- `bn-doppler ci-token` mints a service token with a confirmation prompt.
- `bn-doppler run -- <cmd...>` thin passthrough.
- Templates: `doppler-required.json`, `.github-actions-doppler-snippet.yml`.
