/**
 * Model provider abstraction.
 *
 * A leaderboard that only tests Claude is marketing, not evidence — so the
 * interface is provider-neutral. But every provider needs credentials, and this
 * harness will NOT silently degrade to a single-provider run: a missing key is
 * reported as a hard error naming the provider, because a leaderboard quietly
 * missing three of its four models is worse than one that refuses to start.
 */

/** @typedef {{ id: string, label: string, env: string|null, generate: (prompt: string, opts: object) => Promise<string> }} Provider */

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
      // A localhost endpoint (Ollama's /v1, LM Studio, etc.) needs no key at all.
      const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
      const body = await postJSON(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        headers,
        { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
      );
      return body.choices?.[0]?.message?.content ?? '';
    },
  },

  ollama: {
    id: 'ollama',
    label: 'Local (Ollama)',
    // No cloud key: the model runs on the owner's own hardware.
    env: null,
    async generate(prompt, { model, baseUrl = 'http://localhost:11434' }) {
      const body = await postJSON(`${baseUrl.replace(/\/$/, '')}/api/generate`, {}, { model, prompt, stream: false });
      return body.response ?? '';
    },
  },
};

/** True for http(s) URLs pointing at the machine running this process. */
function isLocalBaseUrl(baseUrl) {
  if (!baseUrl) return false;
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

/**
 * Resolve credentials for the requested models, or throw naming every provider
 * whose key is absent. Fail loudly, never silently narrow the run.
 *
 * A provider with `env: null` (Ollama) never needs a key — it runs on the
 * owner's own hardware. Likewise a model pointed at a localhost baseUrl (the
 * `openaiCompatible` provider talking to Ollama's /v1 endpoint, LM Studio,
 * etc.) needs no key even though the provider normally requires one. Cloud
 * providers are unaffected: a missing key for them still refuses the run.
 */
export function resolveCredentials(models, env = process.env) {
  const missing = [];
  const resolved = [];
  for (const m of models) {
    const provider = PROVIDERS[m.provider];
    if (!provider) throw new Error(`Unknown provider: ${m.provider}`);
    if (provider.env === null || isLocalBaseUrl(m.baseUrl)) {
      resolved.push({ ...m, provider });
      continue;
    }
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

/**
 * Strip markdown fences a model commonly wraps code in.
 *
 * Previously a single backtracking regex (`` /```(?:html|xml)?\s*\n([\s\S]*?)```/ ``)
 * which CodeQL flags js/polynomial-redos: `\s*` followed by a literal `\n` can
 * force catastrophic backtracking on crafted input. This is a linear,
 * indexOf-based scan with the same observable behaviour: strip a ```html /
 * ```xml / ``` fence if one is present and properly closed, trim it, and
 * otherwise just trim the raw text.
 */
export function extractTemplate(text) {
  const open = text.indexOf('```');
  if (open !== -1) {
    let i = open + 3;
    if (text.startsWith('html', i)) i += 4;
    else if (text.startsWith('xml', i)) i += 3;

    // Mirror `\s*\n`: skip a run of whitespace that contains at least one newline.
    let sawNewline = false;
    let j = i;
    while (j < text.length && /\s/.test(text[j])) {
      if (text[j] === '\n') sawNewline = true;
      j++;
    }

    if (sawNewline) {
      const close = text.indexOf('```', j);
      if (close !== -1) return text.slice(j, close).trim();
    }
  }
  return text.trim();
}
