# @basenative/notify

> Email sending with HTML templates, in-app notifications, and SMTP/SendGrid/Resend transports

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/notify
```

## Quick Start

```js
import {
  renderEmail,
  createEmailSender,
  createSmtpTransport,
} from '@basenative/notify';

const transport = createSmtpTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: 'user@example.com', pass: process.env.SMTP_PASS },
});

const sender = createEmailSender(transport);

const template = `
  <h1>Hello, {{ name }}!</h1>
  <p>Your account has been created. <a href="{{ link }}">Get started</a></p>
`;

const { html, text } = renderEmail(template, {
  name: 'Alice',
  link: 'https://example.com/onboarding',
});

await sender.send({
  from: 'noreply@example.com',
  to: 'alice@example.com',
  subject: 'Welcome!',
  html,
  text,
});
```

## In-App Notifications

```js
import { createNotificationCenter } from '@basenative/notify';

const notifications = createNotificationCenter();

notifications.add({ type: 'info', message: 'Your report is ready.' });
notifications.add({ type: 'error', message: 'Payment failed.', persistent: true });

// Read all active notifications
const all = notifications.getAll();
notifications.dismiss(all[0].id);
```

## API

### Email

- `renderEmail(template, data)` — Interpolates `{{ variable }}` placeholders in an HTML template. Returns `{ html, text }` where `text` is a plain-text version derived from the HTML.
- `createEmailSender(transport)` — Creates a sender bound to a transport. Returns `{ send(options) }` where options are `{ to, from, subject, html, text? }`.

### Transports

- `createSmtpTransport(options)` — Sends email via SMTP. Options: `host`, `port`, `secure`, `auth: { user, pass }`.
- `createSendGridTransport(options)` — Sends email via the SendGrid API. Options: `apiKey`.
- `createResendTransport(options)` — Sends email via the Resend API. Options: `apiKey`.

### In-App Notifications

- `createNotificationCenter()` — Creates an in-app notification store.
  - `.add(notification)` — Adds a notification. Fields: `type` (`'info'`, `'warn'`, `'error'`, `'success'`), `message`, `persistent?`, `metadata?`. Returns the created notification with an auto-generated `id`.
  - `.dismiss(id)` — Removes a notification by ID.
  - `.getAll()` — Returns all active notifications.
  - `.clear()` — Removes all notifications.

## License

MIT
