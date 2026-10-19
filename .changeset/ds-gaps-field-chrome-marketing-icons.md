---
'@basenative/components': minor
'@basenative/icons': minor
---

Fill the design-system gaps that forced every property into one-off local builds. `@basenative/components` gains an exported field component (`renderField`, plus the `renderFormField` composer over the built-in controls), site chrome (`renderSiteHeader` with `initSiteHeader`, `renderSiteNav`, `renderSiteFooter`, `renderAppShell`), and marketing primitives (`renderHero`, `renderPricingCard`/`renderPricingCards`, `renderFeatureCard`, `renderStatCard`, `renderFaq`/`renderFaqItem`) — all in the existing idiom of pure render functions over `--bn-*` tokens, with matching styles in `components.css`, catalog and showcase entries, and API docs. `@basenative/icons` grows from 5 glyphs to a 29-icon core set covering the concepts product UI draws by hand today (dashboard, leads, jobs, campaigns, inventory, vehicles, reviews, reports, chat, settings, and the standard utility glyphs).
