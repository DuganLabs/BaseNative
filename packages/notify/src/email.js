/**
 * Render an HTML email template with {{ variable }} interpolation.
 * @param {string} template - HTML template with {{ variable }} placeholders.
 * @param {Record<string, string>} data - Key-value pairs for interpolation.
 * @returns {{ html: string, text: string }}
 */
export function renderEmail(template, data) {
  const html = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return key in data ? String(data[key]) : '';
  });

  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { html, text };
}

/**
 * Create an email sender that delegates to a transport.
 * @param {{ send: (email: object) => Promise<any> }} transport
 * @returns {{ send: (options: { to: string, from: string, subject: string, html: string, text?: string }) => Promise<any> }}
 */
export function createEmailSender(transport) {
  return {
    send(options) {
      return transport.send(options);
    },
  };
}
