/**
 * Create a SendGrid email transport using the v3 API.
 * @param {{ apiKey: string }} config
 * @returns {{ send: (email: { to: string, from: string, subject: string, html: string, text?: string }) => Promise<{ ok: boolean, status: number }> }}
 */
export function createSendGridTransport(config) {
  const { apiKey } = config;

  return {
    async send(email) {
      const { to, from, subject, html, text } = email;

      const body = {
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: { email: from },
        subject,
        content: [],
      };

      if (text) {
        body.content.push({ type: 'text/plain', value: text });
      }
      body.content.push({ type: 'text/html', value: html });

      const response = await globalThis.fetch(
        'https://api.sendgrid.com/v3/mail/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      return { ok: response.ok, status: response.status };
    },
  };
}
