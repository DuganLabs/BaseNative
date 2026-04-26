// Built with BaseNative — basenative.dev
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ ok: true, ts: Date.now() });
    }
    return new Response('Hello from {{name}}', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
