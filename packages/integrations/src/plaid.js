/**
 * @basenative/integrations/plaid — headless Plaid Link wrapper.
 *
 * Client-side: loadPlaidLink() injects the Plaid Link script and
 * returns a handler for opening the Link flow.
 *
 * Server-side: createLinkToken() and exchangePublicToken() wrap the
 * Plaid API for Cloudflare Worker / Node.js environments.
 */

const PLAID_LINK_CDN = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

// ---------- Client-side ----------

/**
 * Load the Plaid Link drop-in script if not already present.
 * Returns a promise that resolves when the script is ready.
 *
 * @returns {Promise<void>}
 */
export function loadPlaidScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('@basenative/integrations/plaid: loadPlaidScript() requires a browser environment'));
      return;
    }

    if (window.Plaid) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${PLAID_LINK_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Plaid Link script')));
      return;
    }

    const script = document.createElement('script');
    script.src = PLAID_LINK_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid Link script'));
    document.head.appendChild(script);
  });
}

/**
 * Open Plaid Link with the given link token.
 *
 * @param {object} options
 * @param {string} options.token         Link token from createLinkToken()
 * @param {function} options.onSuccess   Called with (publicToken, metadata)
 * @param {function} [options.onExit]    Called when user exits Link
 * @param {function} [options.onEvent]   Called on Link events
 * @returns {Promise<{ open: () => void, destroy: () => void }>}
 */
export async function openPlaidLink(options) {
  const { token, onSuccess, onExit, onEvent } = options;

  await loadPlaidScript();

  if (!window.Plaid) {
    throw new Error('@basenative/integrations/plaid: Plaid Link script failed to initialize');
  }

  const handler = window.Plaid.create({
    token,
    onSuccess: (publicToken, metadata) => {
      if (onSuccess) onSuccess(publicToken, metadata);
    },
    onExit: (err, metadata) => {
      if (onExit) onExit(err, metadata);
    },
    onEvent: (eventName, metadata) => {
      if (onEvent) onEvent(eventName, metadata);
    },
  });

  return {
    open: () => handler.open(),
    destroy: () => handler.destroy(),
  };
}

// ---------- Server-side ----------

const PLAID_ENVS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

/**
 * Make a request to the Plaid API.
 *
 * @param {string} path        API path (e.g., '/link/token/create')
 * @param {object} body        Request body
 * @param {object} credentials
 * @param {string} credentials.clientId
 * @param {string} credentials.secret
 * @param {string} [credentials.env='sandbox']
 * @returns {Promise<object>}
 */
async function plaidRequest(path, body, credentials) {
  const baseUrl = PLAID_ENVS[credentials.env || 'sandbox'];
  if (!baseUrl) throw new Error(`@basenative/integrations/plaid: unknown env "${credentials.env}"`);

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: credentials.clientId,
      secret: credentials.secret,
      ...body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error_message || `Plaid API error: ${response.status}`);
    err.plaidError = data;
    throw err;
  }

  return data;
}

/**
 * Create a Plaid Link token for client-side initialization.
 *
 * @param {object} options
 * @param {string} options.userId           Your app's user ID
 * @param {string} [options.clientName]     Display name in Link UI
 * @param {string[]} [options.products]     Plaid products (default: ['transactions'])
 * @param {string[]} [options.countryCodes] Country codes (default: ['US'])
 * @param {string} [options.language]       Language (default: 'en')
 * @param {object} credentials
 * @param {string} credentials.clientId
 * @param {string} credentials.secret
 * @param {string} [credentials.env='sandbox']
 * @returns {Promise<{ linkToken: string, expiration: string, requestId: string }>}
 */
export async function createLinkToken(options, credentials) {
  const data = await plaidRequest('/link/token/create', {
    user: { client_user_id: options.userId },
    client_name: options.clientName || 'BaseNative App',
    products: options.products || ['transactions'],
    country_codes: options.countryCodes || ['US'],
    language: options.language || 'en',
  }, credentials);

  return {
    linkToken: data.link_token,
    expiration: data.expiration,
    requestId: data.request_id,
  };
}

/**
 * Exchange a public token (from Link onSuccess) for an access token.
 *
 * @param {string} publicToken  The public token from Plaid Link
 * @param {object} credentials
 * @returns {Promise<{ accessToken: string, itemId: string, requestId: string }>}
 */
export async function exchangePublicToken(publicToken, credentials) {
  const data = await plaidRequest('/item/public_token/exchange', {
    public_token: publicToken,
  }, credentials);

  return {
    accessToken: data.access_token,
    itemId: data.item_id,
    requestId: data.request_id,
  };
}

/**
 * Fetch account balances for a linked item.
 *
 * @param {string} accessToken  The access token from exchangePublicToken()
 * @param {object} credentials
 * @returns {Promise<{ accounts: Array<{ id: string, name: string, type: string, subtype: string, balances: object }> }>}
 */
export async function getBalances(accessToken, credentials) {
  const data = await plaidRequest('/accounts/balance/get', {
    access_token: accessToken,
  }, credentials);

  return {
    accounts: data.accounts.map(a => ({
      id: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      balances: {
        available: a.balances.available,
        current: a.balances.current,
        limit: a.balances.limit,
        currency: a.balances.iso_currency_code,
      },
    })),
  };
}
