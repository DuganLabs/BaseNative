import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { renderEmail, createEmailSender } from './email.js';
import { createNotificationCenter } from './inapp.js';
import { createSendGridTransport } from './transports/sendgrid.js';
import { createResendTransport } from './transports/resend.js';

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
