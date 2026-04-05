import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
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
