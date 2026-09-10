# @basenative/marketplace

> Community component registry — discover, install, and theme BaseNative components

## Overview

`@basenative/marketplace` provides a client for the BaseNative component registry. It lets you browse and install community components, and manage themes programmatically.

## Installation

```bash
npm install @basenative/marketplace
```

## Quick Start

```js
import { createRegistry, createInstaller, createThemeManager } from '@basenative/marketplace';

// Browse the registry
const registry = createRegistry({ url: 'https://registry.basenative.dev' });
const components = await registry.search('table');
console.log(components);

// Install a component
const installer = createInstaller({ outputDir: './src/components' });
await installer.install('community/data-table@1.2.0');

// Apply a theme
const themes = createThemeManager({ registry });
const available = await themes.list();
await themes.apply('midnight-dark');
```

## API Reference

### createRegistry(options)

Creates a marketplace registry client.

**Options:**
- `url` — registry base URL (default: `'https://registry.basenative.dev'`)
- `token` — optional auth token for private packages

**Returns:** `Registry` with:
- `search(query, options?)` — search for components; returns array of results
- `get(name)` — get metadata for a specific component
- `getVersion(name, version)` — get a specific version's metadata
- `publish(manifest, files, token)` — publish a new component version
- `listThemes(query?)` — list available themes

---

### createInstaller(options)

Installs components from the registry into your project.

**Options:**
- `outputDir` — directory to install component files into
- `registry` — optional `Registry` instance (creates one if omitted)

**Returns:** `Installer` with:
- `install(packageName)` — download and write component files to `outputDir`

---

### createThemeManager(options)

Manages theme discovery and application from the registry.

**Options:**
- `registry` — `Registry` instance

**Returns:** `ThemeManager` with:
- `list()` — list available themes
- `apply(themeId)` — download theme CSS and return the stylesheet string

### renderPackageCard(pkg)

Renders a marketplace package as an HTML `<article data-bn="pkg-card">` string — works on both server (SSR) and client, following the `@basenative/components` render-function convention.

**Parameters:** `pkg` object —
- `name` — package name (e.g. `'@basenative/runtime'`)
- `description` — short description (optional)
- `version` — latest version (optional)
- `author` — author name (optional)
- `category` — package category (optional)
- `tags` — array of tag strings (optional)
- `downloads` — download count; formatted as `1.2k`/`3.4M` above 1,000/1,000,000 (optional, default `0`)
- `updatedAt` — ISO timestamp, rendered as relative time (`'today'`, `'3d ago'`, `'2mo ago'`, …) (optional)
- `repo` — repository URL; when present, the package name is wrapped in a link (optional)

**Returns:** `string` — HTML. All fields are HTML-escaped.

**Example:**
```js
import { renderPackageCard } from '@basenative/marketplace';

const html = renderPackageCard({
  name: '@basenative/runtime',
  description: 'Signal-based reactive runtime',
  version: '1.4.0',
  downloads: 128000,
  tags: ['core', 'signals'],
  repo: 'https://github.com/DuganLabs/basenative',
});
```

---

### packageCardStyles()

Returns the CSS for `renderPackageCard()`'s markup, scoped to `[data-bn="pkg-card"]` and its children. Include it once per page (e.g. in a `<style>` tag) alongside any cards rendered with `renderPackageCard`.

**Returns:** `string` — CSS. Uses `var(--surface-2, ...)`/`var(--accent, ...)`/etc. custom properties with fallbacks, consistent with the rest of BaseNative's theming.

**Example:**
```js
import { renderPackageCard, packageCardStyles } from '@basenative/marketplace';

const page = `
<style>${packageCardStyles()}</style>
${components.map(renderPackageCard).join('')}
`;
```

## Registry API

The registry backend accepts:
- `GET /search?q=<query>&page=<n>&limit=<n>` — search components
- `GET /packages/<name>` — get package metadata
- `GET /packages/<name>/<version>` — get specific version
- `POST /publish` — publish (requires auth token)
- `GET /themes` — list themes
- `GET /themes/<id>` — get theme CSS

## License

Apache-2.0
