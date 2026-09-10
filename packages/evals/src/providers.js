/**
 * Model provider abstraction.
 *
 * A leaderboard that only tests Claude is marketing, not evidence — so the
 * interface is provider-neutral. But every provider needs credentials, and this
 * harness will NOT silently degrade to a single-provider run: a missing key is
 * reported as a hard error naming the provider, because a leaderboard quietly
 * missing three of its four models is worse than one that refuses to start.
 */

/** @typedef {{ id: string, label: string, env: string, generate: (prompt: string, opts: object) => Promise<string> }} Provider */

const JSON_HEADERS = { 'content-type': 'application/json' };

async function postJSON(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: { ...JSON_HEADERS, ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    label: 'Claude',
    env: 'ANTHROPIC_API_KEY',
    async generate(prompt, { model, apiKey, maxTokens = 2048 }) {
      const body = await postJSON(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
      );
      return body.content?.map((c) => c.text ?? '').join('') ?? '';
    },
  },

  openai: {
    id: 'openai',
    label: 'GPT',
    env: 'OPENAI_API_KEY',
    async generate(prompt, { model, apiKey, maxTokens = 2048 }) {
      const body = await postJSON(
        'https://api.openai.com/v1/chat/completions',
        { authorization: `Bearer ${apiKey}` },
        { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
      );
      return body.choices?.[0]?.message?.content ?? '';
    },
  },

  google: {
    id: 'google',
    label: 'Gemini',
    env: 'GEMINI_API_KEY',
    async generate(prompt, { model, apiKey }) {
      const body = await postJSON(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {},
        { contents: [{ parts: [{ text: prompt }] }] }
      );
      return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    },
  },

  openaiCompatible: {
    id: 'openaiCompatible',
    label: 'Open-weight (OpenAI-compatible endpoint)',
    env: 'OPENWEIGHT_API_KEY',
    async generate(prompt, { model, apiKey, baseUrl, maxTokens = 2048 }) {
      if (!baseUrl) throw new Error('openaiCompatible provider requires a baseUrl');
      const body = await postJSON(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        { authorization: `Bearer ${apiKey}` },
        { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
      );
      return body.choices?.[0]?.message?.content ?? '';
    },
  },
};

/**
 * Resolve credentials for the requested models, or throw naming every provider
 * whose key is absent. Fail loudly, never silently narrow the run.
 */
export function resolveCredentials(models, env = process.env) {
  const missing = [];
  const resolved = [];
  for (const m of models) {
    const provider = PROVIDERS[m.provider];
    if (!provider) throw new Error(`Unknown provider: ${m.provider}`);
    const apiKey = env[provider.env];
    if (!apiKey) missing.push(`${provider.label} (${m.provider}) needs ${provider.env}`);
    else resolved.push({ ...m, apiKey, provider });
  }
  if (missing.length) {
    throw new Error(
      'Missing model credentials:\n  ' +
        missing.join('\n  ') +
        '\n\nThe eval suite deliberately refuses to run a partial leaderboard. ' +
        'A published pass-rate table that quietly omits providers is not evidence.'
    );
  }
  return resolved;
}

/** Strip markdown fences a model commonly wraps code in. */
export function extractTemplate(text) {
  const fenced = /```(?:html|xml)?\s*\n([\s\S]*?)```/.exec(text);
  return (fenced ? fenced[1] : text).trim();
}
