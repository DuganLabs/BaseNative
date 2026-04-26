// Built with BaseNative — basenative.dev
/**
 * ops — health checks consumed by the orchestrator's `station-ops` agent.
 *
 * Pure functions. No side effects beyond the network calls they make.
 * Each check returns a structured `{ ok, ...details }` result so the
 * upstream agent can render a TUI panel without parsing strings.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * tunnelHealth — HTTP GET <url>/health.
 * Returns `{ ok: boolean, status?: number, latencyMs?: number, error?: string }`.
 */
export async function tunnelHealth(url, { fetch = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!url) return { ok: false, error: 'url required' };
  const u = url.replace(/\/$/, '');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${u}/health`, { method: 'GET', signal: controller.signal });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err?.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * modelHealth — verifies that the expected model is listed at the
 * primary endpoint.
 */
export async function modelHealth(client) {
  if (!client?.ping) return { ok: false, error: 'invalid client' };
  const res = await client.ping();
  return {
    ok: !!res?.ok && !!res.hasExpectedModel,
    expectedModel: client.model,
    presentModels: res?.models ?? [],
    raw: res,
  };
}

/**
 * gpuHealth — optional remote GPU stat probe. Stubbed; production
 * deployments expose a `/gpu` endpoint over the tunnel that returns
 * `{ tempC, memUsedPct }`.
 */
export async function gpuHealth(url, { fetch = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!url) return { ok: false, stub: true, error: 'url required' };
  const u = url.replace(/\/$/, '');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${u}/gpu`, { method: 'GET', signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status, stub: true };
    const json = await res.json();
    const tempC = Number(json.tempC ?? json.temp ?? -1);
    const memUsedPct = Number(json.memUsedPct ?? json.mem ?? -1);
    return {
      ok: tempC >= 0 && tempC < 85 && memUsedPct >= 0 && memUsedPct < 95,
      tempC,
      memUsedPct,
      raw: json,
    };
  } catch (err) {
    return { ok: false, stub: true, error: err?.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * queueHealth — depth, oldest queued age, in-flight count.
 * Pure — runs against an in-process queue instance.
 */
export function queueHealth(queue) {
  if (!queue?.depth) return { ok: false, error: 'invalid queue' };
  const d = queue.depth();
  // Yellow/red thresholds from spec §9: queue not growing unboundedly.
  const ok = d.queued < 100 && d.oldestQueuedAgeMs < 60 * 60 * 1000; // 1h
  return { ok, ...d };
}

/**
 * summary — composite check used by `bn-station ops`.
 */
export async function summary({ tunnelUrl, client, gpuUrl, queue }) {
  const [tunnel, model, gpu] = await Promise.all([
    tunnelHealth(tunnelUrl),
    modelHealth(client),
    gpuUrl ? gpuHealth(gpuUrl) : Promise.resolve({ ok: true, stub: true }),
  ]);
  const q = queue ? queueHealth(queue) : { ok: true, stub: true };
  return {
    ok: tunnel.ok && model.ok && gpu.ok && q.ok,
    tunnel,
    model,
    gpu,
    queue: q,
  };
}
