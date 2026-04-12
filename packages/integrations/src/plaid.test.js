import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch for server-side API tests
const originalFetch = globalThis.fetch;

describe('plaid server-side', () => {
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

  it('exchangePublicToken calls /item/public_token/exchange', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access-sandbox-xyz',
        item_id: 'item-001',
        request_id: 'req-002',
      }),
    }));

    // Re-import to use fresh fetch mock
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

    const mod = await import('./plaid.js?v=3');
    const result = await mod.getBalances(
      'access-token',
      { clientId: 'cid', secret: 'sec', env: 'sandbox' }
    );

    assert.equal(result.accounts.length, 1);
    assert.equal(result.accounts[0].id, 'acc-1');
    assert.equal(result.accounts[0].name, 'Checking');
    assert.equal(result.accounts[0].balances.available, 1000);
    assert.equal(result.accounts[0].balances.currency, 'USD');

    globalThis.fetch = originalFetch;
  });

  it('throws on Plaid API error', async () => {
    globalThis.fetch = mock.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        error_message: 'INVALID_CREDENTIALS',
        error_type: 'INVALID_INPUT',
      }),
    }));

    const mod = await import('./plaid.js?v=4');
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
    const mod = await import('./plaid.js?v=5');
    await assert.rejects(
      () => mod.createLinkToken({ userId: 'u1' }, { clientId: 'c', secret: 's', env: 'invalid' }),
      /unknown env/
    );
  });

  it('loadPlaidScript rejects in Node.js', async () => {
    const mod = await import('./plaid.js?v=6');
    await assert.rejects(
      () => mod.loadPlaidScript(),
      /requires a browser environment/
    );
  });
});
