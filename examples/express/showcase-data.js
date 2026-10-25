/**
 * The showcase's data: one section per catalog category, every demo a
 * live render from the Holy Trinity registry (the same specimens the
 * component pages show), plus the @basenative/* package family cards.
 * The frame components (app shell, app bar) are not sectioned here —
 * the page itself is running inside them.
 */
import { raw } from '@basenative/runtime/shared/escape';
import { renderTrinity, renderTrinityVm, trinityComponentInfo } from './trinity.js';
import { trinityCatalog, trinityCategoriesWith, trinityDemos } from './trinity-catalog.js';

export const PACKAGES = [
  {
    name: '@basenative/runtime',
    tag: 'core',
    summary: 'Signal-based web runtime over native HTML — zero build step, 9.2KB gzipped (10KB budget).',
  },
  {
    name: '@basenative/server',
    tag: 'core',
    summary: 'Server-side rendering with @if / @for / @switch evaluation and streaming.',
  },
  {
    name: '@basenative/router',
    tag: 'core',
    summary: 'SSR-aware path routing with named params, wildcards, and history API.',
  },
  {
    name: '@basenative/forms',
    tag: 'core',
    summary: 'Signal-based form state with dirty / touched tracking and schema adapters.',
  },
  {
    name: '@basenative/components',
    tag: 'ui',
    summary: '25+ semantic UI components with CSS-custom-property theming.',
  },
  {
    name: '@basenative/combobox',
    tag: 'ui',
    summary: 'Accessible combobox primitive — typeahead filtering plus create-new-entry, WAI-ARIA listbox pattern.',
  },
  {
    name: '@basenative/markdown',
    tag: 'ui',
    summary: 'Zero-dependency ESM markdown parser and SSR-safe HTML renderer.',
  },
  {
    name: '@basenative/visual-builder',
    tag: 'ui',
    summary: 'Drag-and-drop component builder — composes layouts, generates BaseNative code.',
  },
  {
    name: '@basenative/builder',
    tag: 'ui',
    summary: 'Signal-based drag-and-drop component builder runtime for layout editors.',
  },
  {
    name: '@basenative/keyboard',
    tag: 'ui',
    summary: 'Layout-agnostic on-screen virtual keyboard primitive — themable and signal-driven.',
  },
  {
    name: '@basenative/icons',
    tag: 'ui',
    summary: 'Icon system with the curated SVG set used by BaseNative components.',
  },
  {
    name: '@basenative/fonts',
    tag: 'ui',
    summary: 'Font-loading utilities and the bundled Inter font for theme.css.',
  },
  {
    name: '@basenative/favicon',
    tag: 'ui',
    summary: 'SVG-first favicon generator: maskable, manifest, and apple-touch-icon tags.',
  },
  {
    name: '@basenative/auth',
    tag: 'data',
    summary: 'Sessions, RBAC, password hashing, OAuth2/OIDC.',
  },
  {
    name: '@basenative/auth-webauthn',
    tag: 'data',
    summary: 'Passkey adapter for @basenative/auth — Workers/Pages handlers included.',
  },
  {
    name: '@basenative/db',
    tag: 'data',
    summary: 'Query builder with SQLite, Postgres, and Cloudflare D1 adapters.',
  },
  {
    name: '@basenative/middleware',
    tag: 'data',
    summary: 'CORS, rate-limit, CSRF, and signal-aware request adapters.',
  },
  {
    name: '@basenative/tenant',
    tag: 'data',
    summary: 'Multi-tenant middleware with subdomain resolution and row-level scoping.',
  },
  {
    name: '@basenative/upload',
    tag: 'data',
    summary: 'File upload handling with R2 and S3 adapters.',
  },
  {
    name: '@basenative/persist',
    tag: 'data',
    summary: 'Signal-driven local persistence with TTL and conflict resolution.',
  },
  {
    name: '@basenative/realtime',
    tag: 'data',
    summary: 'SSE + WebSocket connections exposed as reactive signals.',
  },
  {
    name: '@basenative/fetch',
    tag: 'data',
    summary: 'Signal-based resource fetching with cache and SSR preload.',
  },
  {
    name: '@basenative/notify',
    tag: 'data',
    summary: 'Email via SMTP and SendGrid with template rendering.',
  },
  {
    name: '@basenative/i18n',
    tag: 'data',
    summary: 'ICU messages, locale detection, and the @t template directive.',
  },
  {
    name: '@basenative/date',
    tag: 'data',
    summary: 'Date utilities, timezone handling, and relative time formatting.',
  },
  {
    name: '@basenative/flags',
    tag: 'data',
    summary: 'Feature flags with percentage rollouts and the @feature directive.',
  },
  {
    name: '@basenative/logger',
    tag: 'data',
    summary: 'Structured logging with multiple transports and child loggers.',
  },
  {
    name: '@basenative/config',
    tag: 'data',
    summary: 'Type-safe environment configuration loading and validation.',
  },
  {
    name: '@basenative/integrations',
    tag: 'data',
    summary: 'Headless wrappers for Plaid, Stripe, and other third parties.',
  },
  {
    name: '@basenative/share',
    tag: 'data',
    summary: 'Web Share API with clipboard fallback and OG-redirect landing pages.',
  },
  {
    name: '@basenative/og-image',
    tag: 'data',
    summary: 'Worker-runtime OG / social-share PNG renderer with KV-cached fonts.',
  },
  {
    name: '@basenative/admin',
    tag: 'data',
    summary: 'Pluggable admin / moderation surface — protected routes, audit log.',
  },
  {
    name: '@basenative/marketplace',
    tag: 'data',
    summary: 'First-party component registry runtime and helpers — no third-party packages published yet.',
  },
  {
    name: '@basenative/station',
    tag: 'data',
    summary: 'Queue-driven local-inference primitive with vLLM + Workers AI fallback.',
  },
  {
    name: '@basenative/validate',
    tag: 'tools',
    summary: 'Structured template diagnostics — every error carries the corrected syntax, not just a description.',
  },
  {
    name: '@basenative/mcp',
    tag: 'tools',
    summary: 'MCP server exposing validate, render, and directive reference to any agent.',
  },
  {
    name: '@basenative/evals',
    tag: 'tools',
    summary: 'Eval harness measuring model output correctness, with and without the validation loop.',
  },
  {
    name: '@basenative/cli',
    tag: 'tools',
    summary: 'The bn CLI — create, prd, speckit, gh, nx, deploy, doctor.',
  },
  {
    name: '@basenative/claude-config',
    tag: 'tools',
    summary: 'Bundled Claude Code subagents, skills, and slash commands.',
  },
  {
    name: '@basenative/doppler',
    tag: 'tools',
    summary: 'Thin DX layer around Doppler — local-dev wrapper, CI helper, validation.',
  },
  {
    name: '@basenative/wrangler-preset',
    tag: 'tools',
    summary: 'Pinned Wrangler version + typed wrangler.toml fragment generator.',
  },
  {
    name: '@basenative/eslint-config',
    tag: 'tools',
    summary: 'Shared ESLint flat-config — security, hygiene, zero-noise defaults.',
  },
  {
    name: '@basenative/tsconfig',
    tag: 'tools',
    summary: 'Shared base tsconfigs — strict, modern, runtime-targeted.',
  },
];

const PACKAGE_GROUPS = [
  { tag: 'core', label: 'Runtime core' },
  { tag: 'ui', label: 'UI & rendering' },
  { tag: 'data', label: 'Data, auth & infra' },
  { tag: 'tools', label: 'Tooling & DX' },
];

function renderPackageCards() {
  return PACKAGE_GROUPS.map((group) => {
    const cards = PACKAGES.filter((p) => p.tag === group.tag)
      .map(
        (p) => `<li data-bn-package-card data-tag="${p.tag}">
  <code>${p.name}</code>
  <p>${p.summary}</p>
</li>`,
      )
      .join('');
    return `<li data-bn-package-group>
  <h3>${group.label}</h3>
  <ul data-bn-package-list>${cards}</ul>
</li>`;
  }).join('');
}

const SHOWCASE_LAYOUTS = {
  button: 'row',
  badge: 'row',
  avatar: 'row',
  form: 'form',
  'search-field': 'form',
};
const NOT_SECTIONED = new Set(['app-shell', 'app-bar']);

export function getShowcaseContext() {
  // Demo markup is assembled from the catalog registry over hand-authored
  // props (trinity-catalog.js), no user input — the same raw() trust
  // assertion the component pages make.
  const entries = trinityCatalog(trinityComponentInfo());
  const sections = trinityCategoriesWith(entries)
    .map((cat) => ({
      id: `showcase-${cat.id}`,
      title: cat.title,
      description: cat.summary,
      category: cat.id,
      demos: cat.components
        .filter((entry) => !NOT_SECTIONED.has(entry.slug))
        .flatMap((entry) =>
          (trinityDemos[entry.slug] ?? (() => []))(renderTrinity, renderTrinityVm).map((demo) => ({
            caption: `${entry.title} — ${demo.title}`,
            layout: SHOWCASE_LAYOUTS[entry.slug] ?? 'stack',
            html: raw(demo.html),
          })),
        ),
    }))
    .filter((section) => section.demos.length > 0);
  return {
    sections,
    packageCount: PACKAGES.length,
    // renderPackageCards() only assembles static, hand-authored strings
    // from PACKAGES above (no user input reaches it) — a legitimate raw().
    packageCards: raw(renderPackageCards()),
  };
}
