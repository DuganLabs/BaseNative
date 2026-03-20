/**
 * Parse the Accept-Language header into a sorted array of locale strings.
 */
function parseAcceptLanguage(header) {
  if (!header) return [];
  return header
    .split(',')
    .map((entry) => {
      const [locale, q] = entry.trim().split(';q=');
      return { locale: locale.trim(), quality: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((e) => e.locale);
}

/**
 * Create i18n middleware that detects locale from the request.
 *
 * Detection order (first match wins):
 *  1. URL query parameter (default: "locale")
 *  2. Cookie (default: "locale")
 *  3. Accept-Language header
 *  4. Default locale from i18n instance
 *
 * @param {object} i18n - i18n instance from createI18n
 * @param {object} [options]
 * @param {string} [options.queryParam='locale'] - URL query param name
 * @param {string} [options.cookie='locale'] - Cookie name
 * @param {string[]} [options.supportedLocales] - Restrict to these locales
 * @returns {Function} middleware function
 */
export function i18nMiddleware(i18n, options = {}) {
  const {
    queryParam = 'locale',
    cookie = 'locale',
    supportedLocales,
  } = options;

  function isSupported(locale) {
    if (!supportedLocales || supportedLocales.length === 0) return true;
    return supportedLocales.includes(locale);
  }

  function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    const cookies = {};
    for (const pair of cookieHeader.split(';')) {
      const [name, ...rest] = pair.trim().split('=');
      if (name) cookies[name.trim()] = rest.join('=').trim();
    }
    return cookies;
  }

  return function middleware(ctx, next) {
    let detected = null;

    // 1. URL query parameter
    if (ctx.url || ctx.request?.url) {
      try {
        const urlStr = ctx.url || ctx.request?.url;
        const url = urlStr.startsWith('http')
          ? new URL(urlStr)
          : new URL(urlStr, 'http://localhost');
        const paramVal = url.searchParams.get(queryParam);
        if (paramVal && isSupported(paramVal)) {
          detected = paramVal;
        }
      } catch {
        // ignore invalid URL
      }
    }

    // 2. Cookie
    if (!detected) {
      const cookieHeader =
        ctx.headers?.cookie ||
        ctx.request?.headers?.cookie ||
        (typeof ctx.get === 'function' ? ctx.get('cookie') : null);
      if (cookieHeader) {
        const cookies = parseCookies(cookieHeader);
        const cookieVal = cookies[cookie];
        if (cookieVal && isSupported(cookieVal)) {
          detected = cookieVal;
        }
      }
    }

    // 3. Accept-Language header
    if (!detected) {
      const acceptLang =
        ctx.headers?.['accept-language'] ||
        ctx.request?.headers?.['accept-language'] ||
        (typeof ctx.get === 'function' ? ctx.get('accept-language') : null);
      if (acceptLang) {
        const locales = parseAcceptLanguage(acceptLang);
        for (const locale of locales) {
          if (isSupported(locale)) {
            detected = locale;
            break;
          }
          // Try base language (e.g. "en" from "en-US")
          const base = locale.split('-')[0];
          if (base !== locale && isSupported(base)) {
            detected = base;
            break;
          }
        }
      }
    }

    // Apply detected locale or keep default
    if (detected) {
      i18n.setLocale(detected);
    }

    // Attach i18n to context
    ctx.i18n = i18n;
    ctx.t = i18n.t;

    if (typeof next === 'function') {
      return next();
    }
  };
}
