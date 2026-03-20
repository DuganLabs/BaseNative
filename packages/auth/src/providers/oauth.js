import { randomBytes } from 'node:crypto';

/**
 * OAuth2 / OIDC authentication provider.
 *
 * @param {object} config
 * @param {string} config.clientId
 * @param {string} config.clientSecret
 * @param {string} config.authorizeUrl
 * @param {string} config.tokenUrl
 * @param {string} config.userInfoUrl
 * @param {string} config.redirectUri
 * @param {string[]} [config.scopes]
 */
export function oauthProvider(config) {
  const {
    clientId,
    clientSecret,
    authorizeUrl,
    tokenUrl,
    userInfoUrl,
    redirectUri,
    scopes = ['openid', 'profile', 'email'],
  } = config;

  return {
    type: 'oauth',

    /**
     * Generate the authorization URL to redirect the user to.
     */
    getAuthUrl(state) {
      const stateParam = state ?? randomBytes(16).toString('hex');
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state: stateParam,
      });
      return { url: `${authorizeUrl}?${params}`, state: stateParam };
    },

    /**
     * Exchange authorization code for tokens and fetch user info.
     */
    async handleCallback(code) {
      // Exchange code for token
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        return { success: false, error: 'Token exchange failed' };
      }

      const tokens = await tokenResponse.json();

      // Fetch user info
      const userResponse = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        return { success: false, error: 'Failed to fetch user info' };
      }

      const user = await userResponse.json();
      return { success: true, user, tokens };
    },
  };
}

/**
 * Pre-configured OAuth providers.
 */
export const providers = {
  github(options) {
    return oauthProvider({
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
      ...options,
    });
  },

  google(options) {
    return oauthProvider({
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['openid', 'profile', 'email'],
      ...options,
    });
  },

  microsoft(options) {
    const tenant = options.tenant ?? 'common';
    return oauthProvider({
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['openid', 'profile', 'email'],
      ...options,
    });
  },
};
