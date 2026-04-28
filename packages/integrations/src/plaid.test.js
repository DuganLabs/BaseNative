import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch for server-side API tests
const originalFetch = globalThis.fetch;

describe('plaid client-side', () => {
  it('loadPlaidScript rejects in Node.js', async () => {
    const { loadPlaidScript } = await import('./plaid.js');
    await assert.rejects(
      () => loadPlaidScript(),
      /requires a browser environment/
    );
  });
});

describe('plaid server-side — link token', () => {
  it('createLinkToken calls /link/token/create', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        link_token: 'link-sandbox-abc123',
        expiration: '2025-06-02T12:00:00Z',
        request_id: 'req-001',
      }),
    }));

    const { createLinkToken } = await import('./plaid.js');

    const result = await createLinkToken(
      { userId: 'user-1', clientName: 'TestApp' },
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.linkToken, 'link-sandbox-abc123');
    assert.equal(result.expiration, '2025-06-02T12:00:00Z');
    assert.equal(result.requestId, 'req-001');

    const [url, opts] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://sandbox.plaid.com/link/token/create');
    assert.equal(opts.method, 'POST');

    const body = JSON.parse(opts.body);
    assert.equal(body.client_id, 'cid');
    assert.equal(body.secret, 'sec');
    assert.equal(body.user.client_user_id, 'user-1');
    assert.equal(body.client_name, 'TestApp');

    globalThis.fetch = originalFetch;
  });
});

describe('plaid server-side — token exchange', () => {
  it('exchangePublicToken calls /item/public_token/exchange', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-sandbox-xyz',
        item_id: 'item-001',
        request_id: 'req-002',
      }),
    }));

    const mod = await import('./plaid.js?v=2');
    const result = await mod.exchangePublicToken(
      'public-sandbox-token',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.accessToken, 'access-sandbox-xyz');
    assert.equal(result.itemId, 'item-001');

    const body = JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body);
    assert.equal(body.public_token, 'public-sandbox-token');

    globalThis.fetch = originalFetch;
  });
});

describe('plaid server-side — accounts & balances', () => {
  it('getAccounts calls /accounts/get', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        accounts: [{
          account_id: 'acc-1',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
        }],
      }),
    }));

    const mod = await import('./plaid.js?v=3a');
    const result = await mod.getAccounts(
      'access-token',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.accounts.length, 1);
    assert.equal(result.accounts[0].id, 'acc-1');
    assert.equal(result.accounts[0].name, 'Checking');

    const [url] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://sandbox.plaid.com/accounts/get');

    globalThis.fetch = originalFetch;
  });

  it('getBalances calls /accounts/balance/get', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        accounts: [{
          account_id: 'acc-1',
          name: 'Checking',
          type: 'depository',
          subtype: 'checking',
          balances: {
            available: 1000,
            current: 1200,
            limit: null,
            iso_currency_code: 'USD',
          },
        }],
      }),
    }));

    const mod = await import('./plaid.js?v=3b');
    const result = await mod.getBalances(
      'access-token',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.accounts.length, 1);
    assert.equal(result.accounts[0].id, 'acc-1');
    assert.equal(result.accounts[0].balances.available, 1000);
    assert.equal(result.accounts[0].balances.currency, 'USD');

    globalThis.fetch = originalFetch;
  });

  it('getBalance is an alias for getBalances', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        accounts: [{
          account_id: 'acc-1',
          name: 'Savings',
          type: 'depository',
          subtype: 'savings',
          balances: {
            available: 5000,
            current: 5000,
            limit: null,
            iso_currency_code: 'USD',
          },
        }],
      }),
    }));

    const mod = await import('./plaid.js?v=3c');
    const result = await mod.getBalance(
      'access-token',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.accounts[0].balances.available, 5000);

    globalThis.fetch = originalFetch;
  });
});

describe('plaid server-side — transfers', () => {
  it('createTransfer initiates a transfer', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        transfer_id: 'xfer-001',
        status: 'pending',
        network: 'ach',
      }),
    }));

    const mod = await import('./plaid.js?v=4a');
    const result = await mod.createTransfer({
      accessToken: 'access-token',
      accountId: 'acc-1',
      type: 'debit',
      amount: 50000, // $500 in cents
      description: 'Test transfer',
    }, { clientId: 'cid', secret: 'sec', env: 'sandbox' });

    assert.equal(result.transferId, 'xfer-001');
    assert.equal(result.status, 'pending');
    assert.equal(result.network, 'ach');

    const [url, opts] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://sandbox.plaid.com/transfer/create');

    const body = JSON.parse(opts.body);
    assert.equal(body.amount, 500); // Converted to dollars
    assert.equal(body.type, 'debit');

    globalThis.fetch = originalFetch;
  });

  it('createTransfer supports FedNow (RTP) network', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        transfer_id: 'xfer-fedNow',
        status: 'pending',
        network: 'rtp',
      }),
    }));

    const mod = await import('./plaid.js?v=4b');
    const result = await mod.createTransfer({
      accessToken: 'access-token',
      accountId: 'acc-1',
      type: 'debit',
      amount: 100000,
      description: 'FedNow transfer',
      network: 'rtp',
    }, { clientId: 'cid', secret: 'sec', env: 'sandbox' });

    assert.equal(result.transferId, 'xfer-fedNow');
    assert.equal(result.network, 'rtp');

    const body = JSON.parse(globalThis.fetch.mock.calls[0].arguments[1].body);
    assert.equal(body.network, 'rtp');

    globalThis.fetch = originalFetch;
  });

  it('createTransfer falls back from FedNow to ACH on error', async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call (RTP) fails
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            error_message: 'INVALID_REQUEST',
            error_code: 'INVALID_REQUEST',
            error_type: 'INVALID_INPUT',
          }),
        });
      }
      // Second call (ACH fallback) succeeds
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          transfer_id: 'xfer-ach-fallback',
          status: 'pending',
          network: 'ach',
        }),
      });
    });

    const mod = await import('./plaid.js?v=4c');
    const result = await mod.createTransfer({
      accessToken: 'access-token',
      accountId: 'acc-1',
      type: 'debit',
      amount: 100000,
      description: 'FedNow with fallback',
      network: 'rtp',
    }, { clientId: 'cid', secret: 'sec', env: 'sandbox' });

    assert.equal(result.transferId, 'xfer-ach-fallback');
    assert.equal(result.network, 'ach');
    assert.equal(callCount, 2);

    globalThis.fetch = originalFetch;
  });

  it('getTransferStatus checks transfer status', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        transfer_id: 'xfer-001',
        status: 'posted',
        amount: 500,
        network: 'ach',
      }),
    }));

    const mod = await import('./plaid.js?v=4d');
    const result = await mod.getTransferStatus(
      'xfer-001',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.transferId, 'xfer-001');
    assert.equal(result.status, 'posted');
    assert.equal(result.amount, 500);

    const [url] = globalThis.fetch.mock.calls[0].arguments;
    assert.equal(url, 'https://sandbox.plaid.com/transfer/get');

    globalThis.fetch = originalFetch;
  });
});

describe('plaid server-side — factory client', () => {
  it('createPlaidClient returns an API client', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-xyz',
        item_id: 'item-001',
        request_id: 'req-123',
      }),
    }));

    const { createPlaidClient } = await import('./plaid.js?v=5');
    const client = createPlaidClient({
      clientId: 'test-id',
      secret: 'test-secret',
      environment: 'sandbox',
    });

    assert.ok(client.exchangePublicToken);
    assert.ok(client.getAccounts);
    assert.ok(client.getBalance);
    assert.ok(client.createTransfer);
    assert.ok(client.getTransferStatus);

    const result = await client.exchangePublicToken('pub-token');
    assert.equal(result.accessToken, 'access-xyz');

    globalThis.fetch = originalFetch;
  });
});

describe('plaid server-side — error handling', () => {
  it('throws on Plaid API error', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        error_message: 'INVALID_CREDENTIALS',
        error_type: 'INVALID_INPUT',
      }),
    }));

    const mod = await import('./plaid.js?v=6');
    await assert.rejects(
      () => mod.createLinkToken({ userId: 'u1' }, { clientId: 'bad', secret: 'bad', env: 'sandbox' }),
      (err) => {
        assert.equal(err.message, 'INVALID_CREDENTIALS');
        assert.ok(err.plaidError);
        return true;
      }
    );

    globalThis.fetch = originalFetch;
  });

  it('rejects unknown env', async () => {
    const mod = await import('./plaid.js?v=7');
    await assert.rejects(
      () => mod.createLinkToken({ userId: 'u1' }, { clientId: 'c', secret: 's', env: 'invalid' }),
      /unknown env/
    );
  });
});
