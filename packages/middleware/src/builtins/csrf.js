import { randomBytes } from 'node:crypto';

/**
 * CSRF protection middleware using double-submit cookie pattern.
 *
 * @param {object} [options]
 * @param {string} [options.cookieName='_csrf'] - Cookie name for the CSRF token
 * @param {string} [options.headerName='x-csrf-token'] - Header name to check
 * @param {string} [options.fieldName='_csrf'] - Form field name to check
 * @param {number} [options.tokenLength=32] - Token byte length
 * @param {string[]} [options.safeMethods] - HTTP methods that skip verification
 */
export function csrf(options = {}) {
  const {
    cookieName = '_csrf',
    headerName = 'x-csrf-token',
    fieldName = '_csrf',
    tokenLength = 32,
    safeMethods = ['GET', 'HEAD', 'OPTIONS'],
  } = options;

  function generateToken() {
    return randomBytes(tokenLength).toString('hex');
  }

  return async (ctx, next) => {
    // Ensure a CSRF token exists
    let token = ctx.request.cookies?.[cookieName];
    if (!token) {
      token = generateToken();
      ctx.state.csrfTokenGenerated = true;
    }
    ctx.state.csrfToken = token;

    // Set cookie on response if generated
    if (ctx.state.csrfTokenGenerated) {
      ctx.response.cookies = ctx.response.cookies ?? {};
      ctx.response.cookies[cookieName] = {
        value: token,
        httpOnly: false, // Client-side JS needs to read this
        sameSite: 'strict',
        path: '/',
      };
    }

    // Skip verification for safe methods
    if (safeMethods.includes(ctx.request.method)) {
      await next();
      return;
    }

    // Verify token
    const submitted =
      ctx.request.headers?.[headerName] ??
      ctx.request.body?.[fieldName];

    if (!submitted || submitted !== token) {
      ctx.response.status = 403;
      ctx.response.body = 'Invalid CSRF token';
      return;
    }

    await next();
  };
}
