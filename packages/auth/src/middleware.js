/**
 * Authentication middleware for the BaseNative middleware pipeline.
 */

/**
 * Session middleware — loads session from cookie, attaches to ctx.state.
 */
export function sessionMiddleware(sessionManager) {
  return async (ctx, next) => {
    const sessionId = ctx.request.cookies?.[sessionManager.cookieName];
    const session = await sessionManager.get(sessionId);

    ctx.state.session = session;
    ctx.state.user = session?.data?.user ?? null;
    ctx.state.isAuthenticated = !!session?.data?.user;

    await next();

    // If a new session was created during request, set cookie
    if (ctx.state._newSession) {
      ctx.response.cookies = ctx.response.cookies ?? {};
      ctx.response.cookies[sessionManager.cookieName] = {
        value: ctx.state._newSession.id,
        ...sessionManager.cookieOptions(),
      };
    }
  };
}

/**
 * Require authentication — redirects or returns 401 if not authenticated.
 */
export function requireAuth(options = {}) {
  const {
    redirectTo,
    message = 'Authentication required',
  } = options;

  return async (ctx, next) => {
    if (!ctx.state.isAuthenticated) {
      if (redirectTo) {
        ctx.response.status = 302;
        ctx.response.headers['location'] = redirectTo;
        ctx.response.body = '';
        return;
      }
      ctx.response.status = 401;
      ctx.response.body = message;
      return;
    }
    await next();
  };
}

/**
 * Login helper — creates session with user data.
 */
export async function login(sessionManager, ctx, user) {
  const session = await sessionManager.create({ user });
  ctx.state.session = session;
  ctx.state.user = user;
  ctx.state.isAuthenticated = true;
  ctx.state._newSession = session;
  return session;
}

/**
 * Logout helper — destroys session.
 */
export async function logout(sessionManager, ctx) {
  if (ctx.state.session) {
    await sessionManager.destroy(ctx.state.session.id);
  }
  ctx.state.session = null;
  ctx.state.user = null;
  ctx.state.isAuthenticated = false;

  // Clear session cookie
  ctx.response.cookies = ctx.response.cookies ?? {};
  ctx.response.cookies[sessionManager.cookieName] = {
    value: '',
    maxAge: 0,
    path: '/',
  };
}
