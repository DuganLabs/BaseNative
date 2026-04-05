# @basenative/i18n

> ICU-style internationalization with locale detection, lazy message loading, and middleware

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/i18n
```

## Quick Start

```js
import { createI18n } from '@basenative/i18n';

const i18n = createI18n({
  defaultLocale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      itemCount: '{count, plural, one {# item} other {# items}}',
    },
    es: {
      greeting: 'Hola, {name}!',
      itemCount: '{count, plural, one {# elemento} other {# elementos}}',
    },
  },
});

i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('itemCount', { count: 3 });     // "3 items"

i18n.setLocale('es');
i18n.t('greeting', { name: 'Alice' }); // "Hola, Alice!"
```

## Lazy Loading

```js
import { createI18n } from '@basenative/i18n';
import { createLoader } from '@basenative/i18n';

const loader = createLoader({
  load: (locale) => import(`./locales/${locale}.json`, { assert: { type: 'json' } })
    .then(m => m.default),
});

const i18n = createI18n({ defaultLocale: 'en' });
await loader.load('fr', i18n);
```

## Server Middleware

```js
import { i18nMiddleware } from '@basenative/i18n';
import { createPipeline } from '@basenative/middleware';

const pipeline = createPipeline()
  .use(i18nMiddleware(i18n));
// ctx.state.locale and ctx.state.t are now available
```

## API

### `createI18n(options?)`

Creates an i18n instance. Options: `defaultLocale` (default: `'en'`), `messages` (locale keyed object).

Returns:

- `t(key, params?)` — Translates a message key with optional interpolation params.
- `getLocale()` — Returns the current locale string.
- `setLocale(locale)` — Changes the active locale.
- `addMessages(locale, messages)` — Merges additional messages into a locale.
- `onLocaleChange(fn)` — Registers a listener called when the locale changes. Returns an unsubscribe function.

### `createLoader(options)`

Creates a lazy message loader. Options: `load(locale)` — async function returning a messages object.

- `loadMessages(locale, i18n)` — Loads messages for a locale into an i18n instance.

### `i18nMiddleware(i18n, options?)`

Detects the request locale from `Accept-Language` header and attaches `ctx.state.locale` and `ctx.state.t` to the request context.

## License

MIT
