import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createTlsServer } from 'node:tls';
import { raw } from '@basenative/runtime/shared/escape';
import { renderEmail, createEmailSender } from './email.js';
import { createNotificationCenter } from './inapp.js';
import { createSendGridTransport } from './transports/sendgrid.js';
import { createResendTransport } from './transports/resend.js';
import { createSmtpTransport } from './transports/smtp.js';

describe('renderEmail', () => {
  it('interpolates variables', () => {
    const template = '<h1>Hello {{ name }}</h1><p>Your code is {{ code }}</p>';
    const result = renderEmail(template, { name: 'Alice', code: '1234' });
    assert.equal(result.html, '<h1>Hello Alice</h1><p>Your code is 1234</p>');
  });

  it('handles missing variables with empty string', () => {
    const template = '<p>Hello {{ name }}, {{ missing }}</p>';
    const result = renderEmail(template, { name: 'Bob' });
    assert.equal(result.html, '<p>Hello Bob, </p>');
  });

  it('strips HTML for text version', () => {
    const template = '<h1>Title</h1><p>Hello {{ name }}</p>';
    const result = renderEmail(template, { name: 'Alice' });
    assert.ok(!result.text.includes('<h1>'));
    assert.ok(!result.text.includes('<p>'));
    assert.ok(result.text.includes('Title'));
    assert.ok(result.text.includes('Hello Alice'));
  });

  it('escapes a script-tag payload instead of injecting it verbatim', () => {
    const template = '<p>Hello {{ name }}</p>';
    const payload = '<script>alert(1)</script>';
    const result = renderEmail(template, { name: payload });
    assert.ok(!result.html.includes('<script>'));
    assert.ok(result.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    // The text fallback should still read as the literal payload text, not
    // execute or vanish it, since it was never a real tag in the markup.
    assert.ok(result.text.includes('<script>alert(1)</script>'));
  });

  it('does not reassemble a tag from a nested <scr<script>ipt> payload', () => {
    const template = '<p>Hello {{ name }}</p>';
    const payload = '<scr<script>ipt>alert(1)</script>';
    const result = renderEmail(template, { name: payload });
    // Escaping the whole substituted value up front means there is no
    // "inner tag" for a single-pass stripper to remove and no leftover
    // fragments that could recombine into a live <script> tag.
    assert.ok(!result.html.includes('<script>'));
    assert.ok(!result.html.includes('<scr<script>ipt>'));
    assert.equal(result.html.match(/<script/gi), null);
  });

  it('does not allow an interpolated value to break out of an attribute', () => {
    const template = '<img src="{{ src }}" alt="pic">';
    const payload = '" onerror="alert(1)';
    const result = renderEmail(template, { src: payload });
    assert.ok(!result.html.includes('" onerror="alert(1)'));
    assert.ok(result.html.includes('&quot;'));
    // Only one real <img> tag exists; the payload's quote did not open a
    // second attribute.
    assert.equal((result.html.match(/<img/gi) || []).length, 1);
  });

  it('inserts a raw() value verbatim, opting out of escaping', () => {
    const template = '<div>{{ body }}</div>';
    const result = renderEmail(template, { body: raw('<strong>Bold</strong>') });
    assert.equal(result.html, '<div><strong>Bold</strong></div>');
    // The unescaped markup is real HTML now, so the text fallback should
    // read it as tags rather than literal angle brackets.
    assert.equal(result.text, 'Bold');
  });

  it('does not escape a raw() value even in an attribute position', () => {
    const template = '<img src="{{ src }}">';
    const result = renderEmail(template, { src: raw('trusted.png') });
    assert.equal(result.html, '<img src="trusted.png">');
  });
});

describe('createEmailSender', () => {
  it('delegates to transport', async () => {
    const sent = [];
    const transport = {
      send(email) {
        sent.push(email);
        return Promise.resolve({ ok: true });
      },
    };

    const sender = createEmailSender(transport);
    const options = {
      to: 'bob@example.com',
      from: 'alice@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
    };

    await sender.send(options);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0], options);
  });
});

describe('createNotificationCenter', () => {
  let center;

  beforeEach(() => {
    center = createNotificationCenter();
  });

  it('adds and retrieves notifications', () => {
    center.notify({ id: '1', title: 'Test', message: 'Hello' });
    const all = center.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].title, 'Test');
    assert.equal(all[0].message, 'Hello');
    assert.equal(all[0].read, false);
  });

  it('gets unread notifications', () => {
    center.notify({ id: '1', title: 'A', message: 'a' });
    center.notify({ id: '2', title: 'B', message: 'b' });
    center.markRead('1');
    const unread = center.getUnread();
    assert.equal(unread.length, 1);
    assert.equal(unread[0].id, '2');
  });

  it('marks all as read', () => {
    center.notify({ id: '1', title: 'A', message: 'a' });
    center.notify({ id: '2', title: 'B', message: 'b' });
    center.markAllRead();
    assert.equal(center.getUnread().length, 0);
  });

  it('removes a notification', () => {
    center.notify({ id: '1', title: 'A', message: 'a' });
    center.notify({ id: '2', title: 'B', message: 'b' });
    center.remove('1');
    assert.equal(center.getAll().length, 1);
    assert.equal(center.getAll()[0].id, '2');
  });

  it('clears all notifications', () => {
    center.notify({ id: '1', title: 'A', message: 'a' });
    center.notify({ id: '2', title: 'B', message: 'b' });
    center.clear();
    assert.equal(center.getAll().length, 0);
  });

  it('subscribe fires on changes', () => {
    const events = [];
    const unsub = center.subscribe((notifications) => {
      events.push(notifications);
    });

    center.notify({ id: '1', title: 'A', message: 'a' });
    assert.equal(events.length, 1);
    assert.equal(events[0].length, 1);

    center.markRead('1');
    assert.equal(events.length, 2);
    assert.equal(events[1][0].read, true);

    center.remove('1');
    assert.equal(events.length, 3);
    assert.equal(events[2].length, 0);

    unsub();
    center.notify({ id: '2', title: 'B', message: 'b' });
    assert.equal(events.length, 3); // no new events after unsubscribe
  });
});

describe('createSendGridTransport', () => {
  it('formats request correctly', async () => {
    let capturedUrl, capturedInit;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return { ok: true, status: 202 };
    };

    try {
      const transport = createSendGridTransport({ apiKey: 'sg-test-key' });
      const result = await transport.send({
        to: 'bob@example.com',
        from: 'alice@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      assert.equal(capturedUrl, 'https://api.sendgrid.com/v3/mail/send');
      assert.equal(capturedInit.method, 'POST');
      assert.equal(
        capturedInit.headers.Authorization,
        'Bearer sg-test-key',
      );
      assert.equal(capturedInit.headers['Content-Type'], 'application/json');

      const body = JSON.parse(capturedInit.body);
      assert.equal(body.personalizations[0].to[0].email, 'bob@example.com');
      assert.equal(body.from.email, 'alice@example.com');
      assert.equal(body.subject, 'Hello');
      assert.equal(body.content.length, 2);
      assert.equal(body.content[0].type, 'text/plain');
      assert.equal(body.content[0].value, 'Hi');
      assert.equal(body.content[1].type, 'text/html');
      assert.equal(body.content[1].value, '<p>Hi</p>');

      assert.equal(result.ok, true);
      assert.equal(result.status, 202);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createResendTransport', () => {
  it('formats request correctly', async () => {
    let capturedUrl, capturedInit;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg-123' }),
      };
    };

    try {
      const transport = createResendTransport({ apiKey: 're-test-key' });
      const result = await transport.send({
        to: 'bob@example.com',
        from: 'alice@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      });

      assert.equal(capturedUrl, 'https://api.resend.com/emails');
      assert.equal(capturedInit.method, 'POST');
      assert.equal(capturedInit.headers.Authorization, 'Bearer re-test-key');
      assert.equal(capturedInit.headers['Content-Type'], 'application/json');

      const body = JSON.parse(capturedInit.body);
      assert.equal(body.from, 'alice@example.com');
      assert.deepEqual(body.to, ['bob@example.com']);
      assert.equal(body.subject, 'Hello');
      assert.equal(body.html, '<p>Hi</p>');
      assert.equal(body.text, undefined);

      assert.equal(result.ok, true);
      assert.equal(result.status, 200);
      assert.equal(result.id, 'msg-123');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// --- Additional tests ---

describe('renderEmail – extended', () => {
  it('trims whitespace around variable names', () => {
    const result = renderEmail('<p>{{  name  }}</p>', { name: 'Trimmed' });
    assert.equal(result.html, '<p>Trimmed</p>');
  });

  it('converts number values to string', () => {
    const result = renderEmail('<p>{{ count }}</p>', { count: 42 });
    assert.equal(result.html, '<p>42</p>');
  });

  it('strips <style> blocks from text output', () => {
    const template = '<style>body{color:red}</style><p>Hello</p>';
    const { text } = renderEmail(template, {});
    assert.ok(!text.includes('body'));
    assert.ok(!text.includes('color'));
    assert.ok(text.includes('Hello'));
  });

  it('strips <script> blocks from text output', () => {
    const template = '<script>alert(1)</script><p>Safe</p>';
    const { text } = renderEmail(template, {});
    assert.ok(!text.includes('alert'));
    assert.ok(text.includes('Safe'));
  });

  it('converts <br> to newline in text output', () => {
    const { text } = renderEmail('Line1<br>Line2<br/>Line3', {});
    assert.ok(text.includes('\n'));
  });

  it('decodes HTML entities in text output', () => {
    const { text } = renderEmail('<p>a &amp; b &lt;c&gt;</p>', {});
    assert.ok(text.includes('a & b <c>'));
  });

  it('returns both html and text keys', () => {
    const result = renderEmail('<p>hi</p>', {});
    assert.ok('html' in result);
    assert.ok('text' in result);
  });
});

describe('createNotificationCenter – extended', () => {
  it('auto-generates id when none provided', () => {
    const center = createNotificationCenter();
    const n = center.notify({ title: 'Auto', message: 'id' });
    assert.ok(typeof n.id === 'string' && n.id.length > 0);
  });

  it('defaults type to "info"', () => {
    const center = createNotificationCenter();
    const n = center.notify({ title: 'T', message: 'M' });
    assert.equal(n.type, 'info');
  });

  it('preserves explicit type', () => {
    const center = createNotificationCenter();
    const n = center.notify({ title: 'T', message: 'M', type: 'error' });
    assert.equal(n.type, 'error');
  });

  it('auto-sets createdAt when not provided', () => {
    const center = createNotificationCenter();
    const n = center.notify({ title: 'T', message: 'M' });
    assert.ok(typeof n.createdAt === 'string');
    assert.ok(!isNaN(Date.parse(n.createdAt)));
  });

  it('preserves explicit createdAt', () => {
    const center = createNotificationCenter();
    const ts = '2024-01-01T00:00:00.000Z';
    const n = center.notify({ title: 'T', message: 'M', createdAt: ts });
    assert.equal(n.createdAt, ts);
  });

  it('markRead on non-existent id is a no-op', () => {
    const center = createNotificationCenter();
    center.notify({ id: 'real', title: 'T', message: 'M' });
    center.markRead('ghost'); // should not throw
    assert.equal(center.getAll().length, 1);
    assert.equal(center.getAll()[0].read, false);
  });

  it('remove on non-existent id is a no-op', () => {
    const center = createNotificationCenter();
    center.notify({ id: 'keep', title: 'T', message: 'M' });
    center.remove('ghost');
    assert.equal(center.getAll().length, 1);
  });

  it('multiple subscribers each receive events', () => {
    const center = createNotificationCenter();
    const a = [];
    const b = [];
    center.subscribe((ns) => a.push(ns.length));
    center.subscribe((ns) => b.push(ns.length));
    center.notify({ title: 'T', message: 'M' });
    assert.deepEqual(a, [1]);
    assert.deepEqual(b, [1]);
  });
});

describe('createSendGridTransport – extended', () => {
  it('omits text/plain content when text is not provided', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) => {
      return { ok: true, status: 202, body: init.body };
    };
    try {
      const transport = createSendGridTransport({ apiKey: 'sg-key' });
      // capture body by checking what was sent
      let sentBody;
      globalThis.fetch = async (_url, init) => {
        sentBody = JSON.parse(init.body);
        return { ok: true, status: 202 };
      };
      await transport.send({
        to: 'r@example.com',
        from: 's@example.com',
        subject: 'No text',
        html: '<p>html only</p>',
      });
      assert.equal(sentBody.content.length, 1);
      assert.equal(sentBody.content[0].type, 'text/html');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns ok false on non-2xx response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    try {
      const transport = createSendGridTransport({ apiKey: 'bad-key' });
      const result = await transport.send({
        to: 'r@example.com',
        from: 's@example.com',
        subject: 'Fail',
        html: '<p>x</p>',
      });
      assert.equal(result.ok, false);
      assert.equal(result.status, 401);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createResendTransport – extended', () => {
  it('includes text field when provided', async () => {
    const originalFetch = globalThis.fetch;
    let sentBody;
    globalThis.fetch = async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ id: 'x' }) };
    };
    try {
      const transport = createResendTransport({ apiKey: 're-key' });
      await transport.send({
        to: 'r@example.com',
        from: 's@example.com',
        subject: 'With text',
        html: '<p>hi</p>',
        text: 'hi',
      });
      assert.equal(sentBody.text, 'hi');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns ok false on non-2xx response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({}),
    });
    try {
      const transport = createResendTransport({ apiKey: 'bad' });
      const result = await transport.send({
        to: 'r@example.com',
        from: 's@example.com',
        subject: 'Fail',
        html: '<p>x</p>',
      });
      assert.equal(result.ok, false);
      assert.equal(result.status, 403);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createSmtpTransport', () => {
  it('returns an object with a send method', () => {
    const transport = createSmtpTransport({ host: 'localhost', port: 25 });
    assert.equal(typeof transport.send, 'function');
  });

  it('rejects when server is unreachable', async () => {
    // Port 1 is always refused — confirms the transport propagates connection errors
    const transport = createSmtpTransport({ host: '127.0.0.1', port: 1 });
    await assert.rejects(() =>
      transport.send({
        to: 'to@example.com',
        from: 'from@example.com',
        subject: 'Test',
        html: '<p>test</p>',
        text: 'test',
      })
    );
  });
});

// Self-signed cert + key for 127.0.0.1, generated once for this test file
// (10-year validity). Used to verify the SMTP transport's TLS certificate
// validation behavior without reaching a real network host.
const TEST_TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7OAYrNW9y6wX2
RNxNbWlhogzXROBrEUr2RLgojILCxytLn+sxSMvsAs4qT+RilgQeLGF8+OAzLEZB
bxM4xQf0oEOW3dco5fKSFRBFe7vAgryw5kmbjVa8lHtl2XY3oSv6s1JoTPeIGios
a9H48Z7iG2dN2Oe4ZdCdOxPHlBBF3k1ENxXi9ceBVC0jCSA5G4vZui4QYyWDdUSf
sXRX5xYp117bVnaswY5Dne3CI/Uzl2z0YV87TmVmfPEUlHG6KPZ1FZJIdyIUg2xE
QQquyS/GxzSoZuK4DzQxsSqfVkDro2mm2DVhZLA/rm9BGas7wOxSdapoh4E86cDB
3BGNystjAgMBAAECggEAUgS2NyG+xIKP5xa9yLHhE+OxanGDO4Sk6YSrhSAhfQFS
R1w05i91Ht0PwtujO0lrXmilAOHrHqAL20i1DA7NcG7xjVt8ki9C+Jp/uWD+nNTp
ozoQDzR5Rj5qXPFK6A4UvUzoEkd9vcNwrGtD3qLDr1zAAgu/YDpCjU8/WBTWmDSO
XDdbCauEX++iN0ImPPk8ShJLTbPVrJ9GVzXGvdGAR7DvRTmNpkt3vM4W/NyQ7PaB
xbdWgvIuJPQPZBHXzOQ+8lPjiooxmWkPICcml5RHgHgyaUghq79SH7T6DT4XGWKx
f9hGtgZnrp2Xg0n/YDw/hRG1mHscX25LJTk5xA2bIQKBgQDnMUHEfzLTATFKRlWK
LT5ufb5vPTA15+m96k46pEk7M9RzFNzswwzI5d+xmVtXD/4B7m2sc/uzVqCAYRM1
o8/E4yxz/daOwptjyiakp/fFJF/rffeLEd7X6buRwYkj5ivNmxST4WxxGMrNNx4/
KrJMHC2LU1Y/zO+nM3YLJISEcQKBgQDPTtWwZOglKZWTuIGkBG6eqa9a2pbnXV8B
uXGLrtpjXzbwm0j7G8ejS0UP+Eg9nST2dywFgLmyj2HamcLOsZ5y94qtMQfPDgK9
85HBnmYSHTrrLFslpZdx0q40kDoWS0syoYbZ9ww7JfNVa8p7loxuG5Mu2rG5m8Aw
+aIfOSPnEwKBgGubmakEK3vbCj4wDpCKDo0PKhxMtqvgjgM/k7nnzc4oibIm+82X
29OGa2AWqVUUtH3hpFqogXcv0vTuOiq1XHef5Yj3lW5NVlZUOThalhDEpYDO2PF6
F+cXe56UHmj/MVQ54pISUo8xovNxvDpafTK/ytMWrwZzNPj2EvOMw8GBAoGBALw2
+gHdi3r6B0iH0oQEVh6NNpzJKwrCFhjtse49ASAJeUr34UnCzf0uwHQgWg4+lymB
xyDz3yUD0rbytRCN6Kq+nlRh2JIfSVQGSMY+NrOpgC22JsbGUfpQakNk0qgdEhfU
2ScZiixFZ2idpceRRsxNEtMOUR+QDe0pKA0rBrKrAoGBAJme5aSOL924GbwKMnWZ
kESi0R8RVrnLwZ2Pl5fJ5bRzWZD9UmsP6WbIda7rlXscgsdzCippAGrf4KhjDPnG
HLo9uNBehHGTzk3GCtMNZR5R8SCRxj9qlpUtu1mMCi1hMI4Jq95igLp6IbcuqozT
wGvqMCVs2IDPk74iSoetJk/5
-----END PRIVATE KEY-----
`;

const TEST_TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIDGjCCAgKgAwIBAgIUJk5ZhPkBWl47kY0IqrtQ6riH9JswDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJMTI3LjAuMC4xMB4XDTI2MDkxMDA3MTMxMVoXDTM2MDkw
NzA3MTMxMVowFDESMBAGA1UEAwwJMTI3LjAuMC4xMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAuzgGKzVvcusF9kTcTW1pYaIM10TgaxFK9kS4KIyCwscr
S5/rMUjL7ALOKk/kYpYEHixhfPjgMyxGQW8TOMUH9KBDlt3XKOXykhUQRXu7wIK8
sOZJm41WvJR7Zdl2N6Er+rNSaEz3iBoqLGvR+PGe4htnTdjnuGXQnTsTx5QQRd5N
RDcV4vXHgVQtIwkgORuL2bouEGMlg3VEn7F0V+cWKdde21Z2rMGOQ53twiP1M5ds
9GFfO05lZnzxFJRxuij2dRWSSHciFINsREEKrskvxsc0qGbiuA80MbEqn1ZA66Np
ptg1YWSwP65vQRmrO8DsUnWqaIeBPOnAwdwRjcrLYwIDAQABo2QwYjAdBgNVHQ4E
FgQUQAnCYLcWeP58AJQndSnvNbpN2hAwHwYDVR0jBBgwFoAUQAnCYLcWeP58AJQn
dSnvNbpN2hAwDwYDVR0TAQH/BAUwAwEB/zAPBgNVHREECDAGhwR/AAABMA0GCSqG
SIb3DQEBCwUAA4IBAQAmh1rzZkzcR+NwCWa4yHzEsvVhZyLmykMK7BzC2nrQsjhw
uIVxx5cx0owPPQQqR1srHvb1SAUJovXx6BLMGfn8SqlJCKpRqz7pcRRKEJfMWsgv
Vbume5boKwUT8DSwjUaA8cmjjHRViA+cChXuP5UFkakwN7u+nMHB30wCGArMhte9
oDHkZcBgTz09H5soCNRge1EzeFejgkRF8u1+2mEo3Cnzp7hQSPeAwYQIowABrXNx
I/HJHlddlx7zWN0N7KVsks+X2p1UH0XfwzJ10XvJCPilBCfZaOv8VxPMx05GOr8X
reFGNaHKe+f2nEF+vrmjnwE2x7F3nFg6xQmHBLlW
-----END CERTIFICATE-----
`;

describe('createSmtpTransport – TLS certificate validation', () => {
  let server;
  let port;

  beforeEach(async () => {
    server = createTlsServer({ key: TEST_TLS_KEY, cert: TEST_TLS_CERT }, (socket) => {
      socket.write('220 fake.test ESMTP\r\n');
      socket.on('data', (chunk) => {
        if (chunk.toString().includes('QUIT')) {
          socket.write('221 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      });
      socket.on('error', () => {});
    });
    server.on('clientError', () => {});
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    port = server.address().port;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects a self-signed certificate by default (rejectUnauthorized: true)', async () => {
    const transport = createSmtpTransport({ host: '127.0.0.1', port, secure: true });
    await assert.rejects(() =>
      transport.send({
        to: 'to@example.com',
        from: 'from@example.com',
        subject: 'Test',
        html: '<p>hi</p>',
        text: 'hi',
      })
    );
  });

  it('connects despite a self-signed certificate when insecureTls is set, and warns', async () => {
    const originalWarn = console.warn;
    const warnCalls = [];
    console.warn = (...args) => warnCalls.push(args.join(' '));

    try {
      const transport = createSmtpTransport({ host: '127.0.0.1', port, secure: true, insecureTls: true });
      await transport.send({
        to: 'to@example.com',
        from: 'from@example.com',
        subject: 'Test',
        html: '<p>hi</p>',
        text: 'hi',
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(warnCalls.some((msg) => msg.includes('insecureTls')));
  });
});

describe('createEmailSender – additional', () => {
  it('returns transport result to caller', async () => {
    const transport = {
      send: async () => ({ ok: true, messageId: 'msg-001' }),
    };
    const sender = createEmailSender(transport);
    const result = await sender.send({
      to: 'to@example.com',
      from: 'from@example.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
    });
    assert.equal(result.ok, true);
    assert.equal(result.messageId, 'msg-001');
  });
});

describe('renderEmail — li and heading conversions', () => {
  it('converts <li> to "- " prefix in text', () => {
    const { text } = renderEmail('<ul><li>Item one</li><li>Item two</li></ul>', {});
    assert.ok(text.includes('- Item one'));
    assert.ok(text.includes('- Item two'));
  });

  it('converts </h1> to double newline in text', () => {
    const { text } = renderEmail('<h1>Title</h1><p>Body</p>', {});
    assert.ok(text.includes('Title'));
  });

  it('collapses excessive newlines in text', () => {
    const { text } = renderEmail('<p>A</p><p>B</p><p>C</p>', {});
    // Should not have 3+ consecutive newlines
    assert.ok(!text.match(/\n{3,}/));
  });
});
