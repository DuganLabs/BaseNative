// Built with BaseNative — basenative.dev
/**
 * Crawler-facing landing page generator.
 *
 * Renders an HTML page that:
 *   - Carries per-share OG / Twitter meta so iMessage/Discord/Twitter/etc.
 *     fetch the right card image.
 *   - Redirects real human visitors to the home (or any) URL via JS — *not*
 *     `<meta http-equiv="refresh">`, because some crawlers chase that and
 *     end up scraping the redirect target instead of the landing page.
 *
 * @module
 */

/**
 * Defensive HTML escape. Inlined so the module has no dependencies.
 *
 * @param {unknown} s
 */
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @typedef {object} LandingMeta
 * @property {string} title         <title> + og:title + twitter:title
 * @property {string} description   description meta + og + twitter
 * @property {string} imageUrl      og:image + twitter:image (absolute)
 * @property {string} canonicalUrl  og:url and the rendered <link rel=canonical>
 * @property {string} [siteName]    og:site_name. default: "BaseNative"
 * @property {string} [imageAlt]    og:image:alt. default: title
 * @property {string} [themeColor]  meta theme-color. default: #0C0B09
 * @property {string} [redirectTo]  human redirect target. default: "/"
 * @property {string} [bodyHeading] visible <h1>. default: title
 * @property {string} [bodyTagline] visible <p>. default: description
 * @property {string} [twitterCard] default: summary_large_image
 * @property {{ width?: number, height?: number }} [imageSize] default 1200×630
 */

/**
 * Build the full HTML document for a share landing page.
 *
 * @param {LandingMeta} meta
 */
export function buildLandingHtml(meta) {
  const {
    title, description, imageUrl, canonicalUrl,
    siteName = 'BaseNative',
    imageAlt = title,
    themeColor = '#0C0B09',
    redirectTo = '/',
    bodyHeading = title,
    bodyTagline = description,
    twitterCard = 'summary_large_image',
    imageSize = { width: 1200, height: 630 },
  } = meta;

  const e = escHtml;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="${e(themeColor)}" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />

  <link rel="canonical" href="${e(canonicalUrl)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(description)}" />
  <meta property="og:image" content="${e(imageUrl)}" />
  <meta property="og:image:width" content="${e(imageSize.width ?? 1200)}" />
  <meta property="og:image:height" content="${e(imageSize.height ?? 630)}" />
  <meta property="og:image:alt" content="${e(imageAlt)}" />
  <meta property="og:url" content="${e(canonicalUrl)}" />
  <meta property="og:site_name" content="${e(siteName)}" />

  <meta name="twitter:card" content="${e(twitterCard)}" />
  <meta name="twitter:title" content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image" content="${e(imageUrl)}" />
  <meta name="twitter:image:alt" content="${e(imageAlt)}" />

  <style>
    html,body{margin:0;height:100%;background:${e(themeColor)};color:#F0EDE4;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;}
    .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:18px;padding:24px;text-align:center;}
    h1{margin:0;font-size:clamp(40px,9vw,96px);letter-spacing:-2px;color:#E8920A;font-weight:800;}
    p{margin:0;font-size:18px;color:#988570;}
    a{color:#E8920A;text-decoration:none;font-weight:700;}
  </style>
  <script>
    // Real visitors get redirected; crawlers don't run JS so they parse the meta above.
    window.location.replace(${JSON.stringify(redirectTo)});
  </script>
</head>
<body>
  <div class="wrap">
    <h1>${e(bodyHeading)}</h1>
    <p>${e(bodyTagline)}</p>
    <p><a href="${e(redirectTo)}">Continue</a></p>
  </div>
</body>
</html>`;
}
