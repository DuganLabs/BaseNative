/**
 * @basenative/integrations/plaid — headless Plaid Link wrapper.
 *
 * Client-side: createPlaidLink() wraps the Plaid Link initialization with signals.
 * Server-side: createPlaidClient() provides account/balance/transfer APIs.
 * Yield optimization: findBestYieldAccount() computes optimal float allocation.
 */

const PLAID_LINK_CDN = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

// ---------- Client-side: Signal-based Link initialization ----------

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
 * Create a signal-based Plaid Link handler.
 * Returns signals for linkToken, linkStatus, and accounts.
 *
 * @param {object} config
 * @param {string} config.token         Link token from createLinkToken()
 * @param {function} config.onSuccess   Called with (publicToken, metadata)
 * @param {function} [config.onExit]    Called when user exits Link
 * @param {function} [config.onEvent]   Called on Link events
 * @param {object} [config.signals]     Signals object with signal(), computed() functions
 * @returns {Promise<{ linkToken: object, linkStatus: object, handler: object }>}
 */
export async function createPlaidLink(config) {
  const { token, onSuccess, onExit, onEvent, signals } = config;

  await loadPlaidScript();

  if (!window.Plaid) {
    throw new Error('@basenative/integrations/plaid: Plaid Link script failed to initialize');
  }

  // If signals are provided, create signal-based state
  const linkTokenSignal = signals?.signal ? signals.signal(token) : null;
  const linkStatusSignal = signals?.signal ? signals.signal('ready') : null;

  const handler = window.Plaid.create({
    token,
    onSuccess: (publicToken, metadata) => {
      if (linkStatusSignal) linkStatusSignal.set('success');
      if (onSuccess) onSuccess(publicToken, metadata);
    },
    onExit: (err, metadata) => {
      if (linkStatusSignal) linkStatusSignal.set('exit');
      if (onExit) onExit(err, metadata);
    },
    onEvent: (eventName, metadata) => {
      if (onEvent) onEvent(eventName, metadata);
    },
  });

  return {
    linkToken: linkTokenSignal,
    linkStatus: linkStatusSignal,
    open: () => handler.open(),
    destroy: () => handler.destroy(),
  };
}

/**
 * Open Plaid Link with the given link token (legacy API).
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

// ---------- Server-side: Plaid Client Factory ----------

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
 * Create a Plaid API client factory with server methods.
 * Works in Cloudflare Workers and Node.js environments.
 *
 * @param {object} config
 * @param {string} config.clientId
 * @param {string} config.secret
 * @param {string} [config.environment='sandbox']
 * @returns {object}
 */
export function createPlaidClient(config) {
  const credentials = {
    clientId: config.clientId,
    secret: config.secret,
    env: config.environment || 'sandbox',
  };

  return {
    exchangePublicToken: (publicToken) => exchangePublicToken(publicToken, credentials),
    getAccounts: (accessToken) => getAccounts(accessToken, credentials),
    getBalance: (accessToken) => getBalance(accessToken, credentials),
    createTransfer: (params) => createTransfer(params, credentials),
    getTransferStatus: (transferId) => getTransferStatus(transferId, credentials),
  };
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
 * Fetch linked accounts (without balance details).
 *
 * @param {string} accessToken  The access token from exchangePublicToken()
 * @param {object} credentials
 * @returns {Promise<{ accounts: Array<{ id: string, name: string, type: string, subtype: string }> }>}
 */
export async function getAccounts(accessToken, credentials) {
  const data = await plaidRequest('/accounts/get', {
    access_token: accessToken,
  }, credentials);

  return {
    accounts: data.accounts.map(a => ({
      id: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
    })),
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

/**
 * Alias for getBalances() for consistency.
 *
 * @param {string} accessToken
 * @param {object} credentials
 * @returns {Promise<object>}
 */
export async function getBalance(accessToken, credentials) {
  return getBalances(accessToken, credentials);
}

/**
 * Initiate a transfer via Plaid Transfer API.
 * Supports FedNow instant transfers (network: "rtp") with graceful fallback to ACH.
 *
 * @param {object} params
 * @param {string} params.accessToken        Access token for the source account
 * @param {string} params.accountId          Account to transfer from
 * @param {string} params.type               Transfer type ("debit" or "credit")
 * @param {number} params.amount             Amount in cents
 * @param {string} params.description        Transfer description
 * @param {string} [params.network]          "rtp" (RTP/FedNow) or "ach" (default: auto-detect)
 * @param {object} [params.user]             User info { name, email }
 * @param {object} credentials
 * @returns {Promise<{ transferId: string, status: string, network: string }>}
 */
export async function createTransfer(params, credentials) {
  const {
    accessToken,
    accountId,
    type,
    amount,
    description,
    network,
    user,
  } = params;

  const body = {
    access_token: accessToken,
    account_id: accountId,
    type,
    amount: amount / 100, // Convert cents to dollars
    description: description || 'Transfer via PendingBusiness',
  };

  // If network is explicitly set to "rtp" (RTP/FedNow), use it
  // Otherwise, let Plaid auto-detect or default to ACH
  if (network === 'rtp') {
    body.network = 'rtp';
  }

  if (user) {
    body.user = {
      name: user.name,
      email_address: user.email,
    };
  }

  try {
    const data = await plaidRequest('/transfer/create', body, credentials);

    return {
      transferId: data.transfer_id,
      status: data.status,
      network: data.network || 'ach', // Default to ACH if not specified
    };
  } catch (err) {
    // If FedNow fails, retry with ACH
    if (network === 'rtp' && err.plaidError?.error_code === 'INVALID_REQUEST') {
      const achBody = { ...body };
      delete achBody.network;
      const data = await plaidRequest('/transfer/create', achBody, credentials);
      return {
        transferId: data.transfer_id,
        status: data.status,
        network: 'ach', // Fell back to ACH
      };
    }
    throw err;
  }
}

/**
 * Check the status of a transfer.
 *
 * @param {string} transferId   Transfer ID from createTransfer()
 * @param {object} credentials
 * @returns {Promise<{ transferId: string, status: string, amount: number, network: string }>}
 */
export async function getTransferStatus(transferId, credentials) {
  const data = await plaidRequest('/transfer/get', {
    transfer_id: transferId,
  }, credentials);

  return {
    transferId: data.transfer_id,
    status: data.status,
    amount: data.amount,
    network: data.network || 'ach',
  };
}
