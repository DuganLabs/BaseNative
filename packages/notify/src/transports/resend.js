/**
 * Create a Resend email transport using the Resend API.
 * @param {{ apiKey: string }} config
 * @returns {{ send: (email: { to: string, from: string, subject: string, html: string, text?: string }) => Promise<{ ok: boolean, status: number, id?: string }> }}
 */
export function createResendTransport(config) {
  const { apiKey } = config;

  return {
    async send(email) {
      const { to, from, subject, html, text } = email;

      const body = {
        from,
        to: [to],
        subject,
        html,
      };

      if (text) {
        body.text = text;
      }

      const response = await globalThis.fetch(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();

      return { ok: response.ok, status: response.status, id: data.id };
    },
  };
}
