// Built with BaseNative — basenative.dev
/**
 * OpenAICompatClient — fetch-only HTTP client targeting any
 * OpenAI-compatible chat-completion endpoint (vLLM behind cloudflared,
 * Workers AI gpt-oss-120b in fallback mode, etc.).
 *
 * Worker-runtime safe: no node:fs, no node:net, no node:http. Only
 * `globalThis.fetch`. Both Node 18+ and Workers ship a compatible fetch.
 *
 * Hard timeout: 30 seconds per call (spec'd). On primary fail, falls
 * back to the secondary endpoint if configured. On both fail, throws
 * `StationUnavailable`.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export class StationUnavailable extends Error {
  constructor(message, { primary, fallback } = {}) {
    super(message);
    this.name = 'StationUnavailable';
    this.primary = primary;
    this.fallback = fallback;
  }
}

export class StationTimeout extends Error {
  constructor(message) {
    super(message);
    this.name = 'StationTimeout';
  }
}

/**
 * @typedef {{
 *   baseUrl: string,
 *   model: string,
 *   apiKey?: string,
 *   fallbackUrl?: string,
 *   fallbackModel?: string,
 *   fallbackApiKey?: string,
 *   timeoutMs?: number,
 *   fetch?: typeof globalThis.fetch,
 * }} ClientOptions
 */

export class OpenAICompatClient {
  /** @param {ClientOptions} opts */
  constructor(opts) {
    if (!opts?.baseUrl) throw new Error('OpenAICompatClient: baseUrl is required');
    if (!opts?.model) throw new Error('OpenAICompatClient: model is required');
    this.baseUrl = stripTrailingSlash(opts.baseUrl);
    this.model = opts.model;
    this.apiKey = opts.apiKey ?? null;
    this.fallbackUrl = opts.fallbackUrl ? stripTrailingSlash(opts.fallbackUrl) : null;
    this.fallbackModel = opts.fallbackModel ?? opts.model;
    this.fallbackApiKey = opts.fallbackApiKey ?? null;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this._fetch = opts.fetch ?? globalThis.fetch;
    if (!this._fetch) {
      throw new Error(
        'OpenAICompatClient: no global fetch — pass `fetch` explicitly (Node <18 unsupported).'
      );
    }
  }

  /**
   * Run one chat-completion call.
   *
   * @param {{
   *   messages: Array<{role: 'system'|'user'|'assistant', content: string}>,
   *   temperature?: number,
   *   maxTokens?: number,
   *   stop?: string[],
   * }} req
   * @returns {Promise<{text: string, usage?: object, latencyMs: number, source: 'primary'|'fallback'}>}
   */
  async chat(req) {
    const started = Date.now();
    try {
      const text = await this._chatAt({
        url: this.baseUrl,
        model: this.model,
        apiKey: this.apiKey,
        req,
      });
      return { ...text, latencyMs: Date.now() - started, source: 'primary' };
    } catch (primaryErr) {
      if (!this.fallbackUrl) {
        throw new StationUnavailable(
          `Station primary failed and no fallback configured: ${primaryErr.message}`,
          { primary: primaryErr }
        );
      }
      try {
        const text = await this._chatAt({
          url: this.fallbackUrl,
          model: this.fallbackModel,
          apiKey: this.fallbackApiKey,
          req,
        });
        return { ...text, latencyMs: Date.now() - started, source: 'fallback' };
      } catch (fallbackErr) {
        throw new StationUnavailable(
          `Both primary and fallback failed: primary=${primaryErr.message}, fallback=${fallbackErr.message}`,
          { primary: primaryErr, fallback: fallbackErr }
        );
      }
    }
  }

  async _chatAt({ url, model, apiKey, req }) {
    const body = {
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 1024,
      ...(req.stop ? { stop: req.stop } : {}),
    };
    const headers = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const res = await this._fetchWithTimeout(`${url}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const choice = json?.choices?.[0]?.message?.content;
    if (typeof choice !== 'string') {
      throw new Error(`malformed response: missing choices[0].message.content`);
    }
    return { text: choice, usage: json.usage ?? null };
  }

  /** GET /v1/models — verifies that the expected model is listed. */
  async ping() {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/v1/models`, { method: 'GET' });
      if (!res.ok) return { ok: false, status: res.status };
      const json = await res.json();
      const models = Array.isArray(json?.data) ? json.data.map((m) => m.id) : [];
      return {
        ok: true,
        status: res.status,
        models,
        hasExpectedModel: models.includes(this.model),
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** GET /health — uses tunnel/L7 health endpoint, not vLLM-specific. */
  async health() {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/health`, { method: 'GET' });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async _fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this._fetch(url, { ...init, signal: controller.signal });
      return res;
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new StationTimeout(`request to ${url} exceeded ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

// Alias for spec-mandated public name.
export const Client = OpenAICompatClient;

function stripTrailingSlash(s) {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
