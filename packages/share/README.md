# @basenative/share

Three things every shareable BaseNative app needs, packaged together:

1. **Native share + clipboard fallback** for the browser.
2. **Share-card mint** — server-side store + POST handler that turns a
   game/post/result into a stable short URL.
3. **OG-redirect landing page** — crawler-facing HTML at `/s/{id}` so
   iMessage / Discord / Twitter / LinkedIn render the right card image,
   while real visitors get JS-redirected onward.

Composes with `@basenative/og-image` for the per-share PNG.

## Install

```sh
pnpm add @basenative/share
# Optional — server-side PNG rendering
pnpm add @basenative/og-image
```

## Client — sharing from the browser

```js
import { nativeShare, mintShareCard, composeShareText } from '@basenative/share/client';

const { id, url } = await mintShareCard({
  sessionId, category, score, won, grid,
});

const text = composeShareText(
  'T4BS · ${category} · ${score}pts · ${verdict}\n\n${grid}',
  { category, score, verdict: won ? 'Solved' : 'Busted', grid }
);

const result = await nativeShare({ text, url });
// result.status: 'shared' | 'copied' | 'failed'
```

`nativeShare` uses the Web Share API where available, falls back to
`navigator.clipboard.writeText` with the URL appended, and respects user
cancel (`AbortError`) so we don't ambush them by silently copying instead.

## Server — minting + landing

In `functions/api/share-cards.js`:

```js
import { defineShareCards, mintHandler } from '@basenative/share/server';

export const onRequestPost = async (ctx) => {
  const store = defineShareCards({ db: ctx.env.DB });
  return mintHandler({
    store,
    validate: (b) => {
      if (typeof b.category !== 'string' || !b.category) return 'bad-category';
      if (typeof b.score !== 'number') return 'bad-score';
      return true;
    },
  })(ctx);
};
```

In `functions/s/[id].js`:

```js
import { defineShareCards, landingHandler } from '@basenative/share/server';

export const onRequestGet = async (ctx) => {
  const store = defineShareCards({ db: ctx.env.DB });
  return landingHandler({
    store,
    ogImage: (_card, { origin, id }) => `${origin}/og/score/${id}.png`,
    buildMeta: (card, { origin, id, ogImage }) => ({
      title: `T4BS — ${card.won ? 'Solved' : 'Busted'} ${card.category} for ${card.score}pts`,
      description: `Five-letter battle of bullshit — ${card.category}.`,
      imageUrl: ogImage,
      imageAlt: `T4BS score card`,
      canonicalUrl: `${origin}/s/${id}`,
      siteName: 'T4BS',
      themeColor: '#0C0B09',
    }),
    redirectTo: '/',
  })(ctx);
};
```

Apply `migrations/0001_share_cards.sql` to set up the `share_cards` table.

## Hooking up `@basenative/og-image`

In `functions/og/score/[id].png.js`:

```js
import { defineShareCards } from '@basenative/share/server';
import { renderPng, defaultTheme } from '@basenative/og-image';
import { scoreCard } from '@basenative/og-image/presets';

export const onRequestGet = async ({ env, params }) => {
  const store = defineShareCards({ db: env.DB });
  const card = await store.get(params.id);
  if (!card) return new Response('not found', { status: 404 });

  const png = await renderPng(scoreCard({
    category: card.category,
    score: card.score,
    won: !!card.won,
    grid: card.grid,
    theme: defaultTheme,
  }));
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
```

The `landingHandler` references this URL, the crawler fetches it, and the
preview renders.

## Custom domains, custom roots

- `origin` accepts a string or `(env) => string`.
- `path` defaults to `/s/`.
- `idPattern` defaults to `/^[a-z0-9]{4,16}$/i`.
- `validate` lets you reject malformed mint requests inline.

## License

Apache-2.0.
