# @basenative/marketplace

> Community component marketplace — browse, install, and manage BaseNative packages and themes

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/marketplace
```

## Quick Start

```js
import { createRegistry, createInstaller, createThemeManager } from '@basenative/marketplace';

// Search the registry
const registry = createRegistry({ url: 'https://registry.basenative.dev' });
const { packages } = await registry.search('calendar', { limit: 10 });

// Get details for a specific package
const pkg = await registry.getPackage('bn-calendar');
const versions = await registry.getVersions('bn-calendar');

// Install a package into the current project
const installer = createInstaller({ projectRoot: process.cwd() });
await installer.install('bn-calendar@1.2.0');
await installer.uninstall('bn-calendar');
const installed = await installer.list();
```

## Themes

```js
import { createThemeManager } from '@basenative/marketplace';

const themes = createThemeManager({ registry });

// Browse and apply themes
const available = await themes.list();
await themes.apply('basenative-midnight');
await themes.reset();
```

## API

### `createRegistry(options?)`

Creates a marketplace registry client. Options: `url` (default: `'https://registry.basenative.dev'`), `token` (auth token for publishing).

- `search(query, options?)` — Searches packages. Options: `offset`, `limit`, `tag`, `category`, `sort`. Returns `{ packages, total }`.
- `getPackage(name)` — Returns full metadata for a package by name.
- `getVersions(name)` — Returns an array of published versions for a package.
- `publish(manifest, tarball)` — Publishes a package to the registry (requires `token`).

### `createInstaller(options?)`

Creates a local installer. Options: `projectRoot` — path to the project directory.

- `install(packageSpec)` — Installs a package (e.g. `'bn-calendar'` or `'bn-calendar@1.2.0'`).
- `uninstall(name)` — Removes an installed package.
- `list()` — Returns an array of currently installed marketplace packages.
- `update(name)` — Updates an installed package to its latest version.

### `createThemeManager(options)`

Creates a theme manager. Options: `registry` — a registry client instance.

- `list()` — Returns available themes from the registry.
- `apply(themeName)` — Downloads and applies a theme to the project.
- `reset()` — Removes the currently applied theme and restores defaults.

## License

MIT
