# @basenative/notify

> Email delivery and in-app notifications with SMTP, SendGrid, and Resend transports.

## Overview

`@basenative/notify` separates email rendering from delivery. `renderEmail` produces both HTML and plain-text versions of a template. `createEmailSender` wraps any transport and exposes a single `send` method. Three transports are included: a zero-dependency SMTP implementation using `node:net`/`node:tls`, a SendGrid adapter, and a Resend adapter. `createNotificationCenter` manages in-app notification queues.

## Installation

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
  auth: { user: 'noreply@example.com', pass: 'secret' },
});

const mailer = createEmailSender(transport);

const template = `
  <h1>Welcome, {{ name }}!</h1>
  <p>Your account at {{ appName }} is ready.</p>
`;

const { html, text } = renderEmail(template, {
  name: 'Alice',
  appName: 'MyApp',
});

await mailer.send({
  from: 'noreply@myapp.com',
  to: 'alice@example.com',
  subject: 'Welcome to MyApp',
  html,
  text,
});
```

## API Reference

### renderEmail(template, data)

Renders an HTML email template with `{{ variable }}` interpolation and automatically generates a plain-text version.

**Parameters:**
- `template` — HTML string with `{{ key }}` placeholders
- `data` — key/value pairs for interpolation

**Returns:** `{ html: string, text: string }`. The `text` version strips HTML tags, converts `<br>`, `</p>`, `</h1>`–`</h6>`, and `<li>` to newlines, and decodes common HTML entities.

---

### createEmailSender(transport)

Creates an email sender that delegates to the provided transport.

**Parameters:**
- `transport` — any transport object with a `send(email) => Promise<any>` method

**Returns:** Object with a single `send(options)` method.

**send options:**
- `to` — recipient email address string
- `from` — sender email address string
- `subject` — email subject line
- `html` — HTML body
- `text` — plain-text body (optional but recommended)

---

### createSmtpTransport(config)

Zero-dependency SMTP transport using Node.js built-in `node:net` and `node:tls`.

**Parameters:**
- `config.host` — SMTP server hostname
- `config.port` — SMTP server port
- `config.secure` — use TLS (SSL); default `false`
- `config.auth.user` — SMTP username
- `config.auth.pass` — SMTP password

**Returns:** Transport object with `send(email) => Promise<void>`.

**Example:**
```js
const transport = createSmtpTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'me@gmail.com', pass: 'app-password' },
});
```

Note: For high-volume production use, consider using nodemailer with this package's `createEmailSender` wrapper.

---

### createSendGridTransport(config)

SendGrid email transport.

**Parameters:**
- `config.apiKey` — SendGrid API key

**Returns:** Transport object.

**Example:**
```js
import { createSendGridTransport, createEmailSender } from '@basenative/notify';

const mailer = createEmailSender(
  createSendGridTransport({ apiKey: process.env.SENDGRID_API_KEY })
);
```

---

### createResendTransport(config)

Resend email transport.

**Parameters:**
- `config.apiKey` — Resend API key

**Returns:** Transport object.

---

### createNotificationCenter()

Creates an in-app notification center for managing per-user notification queues.

**Returns:** Notification center object with methods for creating, listing, and marking notifications as read.

## Configuration

Transport credentials should be loaded from environment variables via `@basenative/config`:

```js
import { defineConfig, string } from '@basenative/config';

const config = defineConfig({
  schema: {
    SMTP_HOST: string(),
    SMTP_PORT: number(),
    SMTP_USER: string(),
    SMTP_PASS: string(),
  },
});
```

## Integration

`renderEmail` works with any HTML template string. Combine with `@basenative/server`'s `render()` function to generate email templates using the same BaseNative template syntax used for web pages.
