/**
 * Parse an ICU-like plural expression.
 * Pattern: "{count, plural, one {# item} other {# items}}"
 */
function parsePlural(template, params) {
  return template.replace(
    /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g,
    (_, paramName, cases) => {
      const value = Number(params[paramName]);
      const parsed = {};
      const caseRegex = /(\w+)\s*\{([^}]*)\}/g;
      let match;
      while ((match = caseRegex.exec(cases)) !== null) {
        parsed[match[1]] = match[2];
      }
      let category;
      if (value === 0 && parsed.zero) {
        category = 'zero';
      } else if (value === 1 && parsed.one) {
        category = 'one';
      } else if (value === 2 && parsed.two) {
        category = 'two';
      } else {
        category = 'other';
      }
      const result = parsed[category] || parsed.other || '';
      return result.replace(/#/g, String(value));
    }
  );
}

/**
 * Interpolate simple {param} placeholders.
 */
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}

/**
 * Create an i18n instance.
 *
 * @param {object} [options]
 * @param {string} [options.defaultLocale='en'] - The default locale
 * @param {Record<string, Record<string, string>>} [options.messages] - Initial messages keyed by locale
 * @returns {object} i18n instance
 */
export function createI18n(options = {}) {
  const { defaultLocale = 'en', messages: initialMessages = {} } = options;

  let currentLocale = defaultLocale;
  const messages = {};
  const listeners = [];

  // Load initial messages
  for (const [locale, msgs] of Object.entries(initialMessages)) {
    messages[locale] = { ...msgs };
  }

  function getLocale() {
    return currentLocale;
  }

  function setLocale(locale) {
    if (currentLocale !== locale) {
      currentLocale = locale;
      for (const fn of listeners) fn(locale);
    }
  }

  function onLocaleChange(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function addMessages(locale, msgs) {
    if (!messages[locale]) {
      messages[locale] = {};
    }
    Object.assign(messages[locale], msgs);
  }

  /**
   * Translate a key with optional interpolation parameters.
   */
  function t(key, params) {
    const localeMessages = messages[currentLocale];
    let template = localeMessages ? localeMessages[key] : undefined;

    // Fallback to default locale
    if (template === undefined && currentLocale !== defaultLocale) {
      const fallback = messages[defaultLocale];
      template = fallback ? fallback[key] : undefined;
    }

    if (template === undefined) {
      return key;
    }

    // Handle plural patterns first
    if (params && template.includes(', plural,')) {
      template = parsePlural(template, params);
    }

    // Then handle simple interpolation
    return interpolate(template, params);
  }

  /**
   * Format a number according to the current locale.
   */
  function n(value, formatOptions = {}) {
    return new Intl.NumberFormat(currentLocale, formatOptions).format(value);
  }

  /**
   * Format a date according to the current locale.
   */
  function d(value, formatOptions = {}) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(currentLocale, formatOptions).format(date);
  }

  return {
    get locale() {
      return getLocale();
    },
    set locale(val) {
      setLocale(val);
    },
    getLocale,
    setLocale,
    onLocaleChange,
    addMessages,
    t,
    n,
    d,
  };
}
