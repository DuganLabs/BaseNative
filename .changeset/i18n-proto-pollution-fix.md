---
"@basenative/i18n": patch
---

Fix a prototype-pollution surface (CodeQL `js/prototype-polluting-assignment`) in `createI18n`: `addMessages(locale, msgs)` stored per-locale message tables on a plain `{}` object keyed by `locale`, so a caller passing `locale: '__proto__'` would `Object.assign` `msgs` straight onto `Object.prototype`. The internal message store is now created with `Object.create(null)`. No change to `createI18n`'s public behavior. Also switches the loader tests' temp directories from a `Date.now()`-suffixed name to `fs.mkdtemp` (CodeQL `js/insecure-temporary-file`); test-only, no package behavior change.
