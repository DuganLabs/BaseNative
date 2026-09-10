# @basenative/doppler

## 0.2.1

### Patch Changes

- 99561f7: Fix a file-system TOCTOU race (CodeQL `js/file-system-race`) in `bn doppler init`: the starter `doppler-required.json` write used an `existsSync` check followed by a separate write, which could silently clobber a file created in between. Now uses an exclusive create (`{ flag: 'wx' }`) and handles `EEXIST`. No user-visible behavior change.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: thin DX layer around Doppler — `dopplerRun` wrapper, `requireSecrets` boot-time validator, Wrangler vars/secrets injector, `doppler-required.json` schema, and a `bn-doppler` CLI (init / verify / ci-token / run). Plumbing only — never values.

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
