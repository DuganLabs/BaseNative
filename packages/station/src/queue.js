// Built with BaseNative — basenative.dev
/**
 * Queue — SQLite-backed job store for Station.
 *
 * Schema (mirror of DUGANLABS_ORCHESTRATOR_SPEC §9 reference):
 *
 *   station_jobs(id, venture, intent, status, payload, created_at,
 *                iterations, max_iterations, stall_threshold,
 *                escalate_to, last_iteration_at, last_error)
 *
 *   station_iterations(id, job_id, iteration, prompt, response,
 *                      applied_diff, success, ran_at)
 *
 * Drivers:
 *   - better-sqlite3 (production) — auto-detected via dynamic import.
 *   - in-memory (tests, Workers, fallback) — pure JS, identical surface.
 *
 * Note: production deployments install `better-sqlite3` as a workspace
 * dep on the orchestrator side; we don't list it as a peer here so the
 * Workers-side consumer doesn't pull native deps in the bundle.
 */

const STATUSES = Object.freeze(['queued', 'running', 'stalled', 'done', 'escalated', 'failed']);

/**
 * In-memory driver — full-featured, used in tests + as the fallback
 * when better-sqlite3 isn't available.
 */
export class MemoryQueueDriver {
  constructor() {
    /** @type {Map<string, any>} */
    this.jobs = new Map();
    /** @type {any[]} */
    this.iterations = [];
  }

  insertJob(row) {
    this.jobs.set(row.id, { ...row });
  }

  updateJob(id, patch) {
    const cur = this.jobs.get(id);
    if (!cur) return false;
    Object.assign(cur, patch);
    return true;
  }

  getJob(id) {
    const r = this.jobs.get(id);
    return r ? { ...r } : null;
  }

  selectQueued(limit = 1) {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'queued')
      .sort((a, b) => a.created_at - b.created_at)
      .slice(0, limit)
      .map((j) => ({ ...j }));
  }

  list({ status, venture } = {}) {
    return [...this.jobs.values()]
      .filter((j) => (status ? j.status === status : true))
      .filter((j) => (venture ? j.venture === venture : true))
      .sort((a, b) => a.created_at - b.created_at)
      .map((j) => ({ ...j }));
  }

  insertIteration(row) {
    this.iterations.push({ ...row });
  }

  iterationsFor(jobId) {
    return this.iterations.filter((i) => i.job_id === jobId).map((i) => ({ ...i }));
  }
}

/**
 * Queue — facade over a driver.
 *
 * The driver split is intentional: the test suite mocks at the driver
 * boundary, the Workers runtime uses MemoryQueueDriver, the Node
 * production path uses a better-sqlite3 driver loaded lazily.
 */
export class Queue {
  /** @param {{driver: MemoryQueueDriver}} opts */
  constructor({ driver }) {
    this.driver = driver;
  }

  /**
   * Enqueue a new job. Idempotent on `id` collision: throws so callers
   * get a chance to dedupe upstream rather than silently overwrite.
   */
  enqueue(job) {
    const id = job.id ?? cryptoRandomId();
    if (this.driver.getJob(id)) {
      throw new Error(`Queue.enqueue: job '${id}' already exists`);
    }
    const row = {
      id,
      venture: job.venture,
      intent: job.intent,
      status: 'queued',
      payload: JSON.stringify(job.payload ?? {}),
      created_at: job.createdAt ?? Date.now(),
      iterations: 0,
      max_iterations: job.maxIterations ?? 10,
      stall_threshold: job.stallThreshold ?? 3,
      escalate_to: job.escalateTo ?? 'sonnet',
      last_iteration_at: null,
      last_error: null,
    };
    this.driver.insertJob(row);
    return id;
  }

  /**
   * Claim the oldest queued job and flip it to `running`. Returns null
   * if the queue is empty.
   */
  claim() {
    const [next] = this.driver.selectQueued(1);
    if (!next) return null;
    this.driver.updateJob(next.id, { status: 'running' });
    return decodeRow({ ...next, status: 'running' });
  }

  /**
   * Record one model iteration against a job. Increments the
   * iteration counter, stamps `last_iteration_at`, and persists the
   * full prompt/response/diff/success row to `station_iterations`.
   */
  recordIteration(jobId, { iteration, prompt, response, appliedDiff, success }) {
    const job = this.driver.getJob(jobId);
    if (!job) throw new Error(`Queue.recordIteration: unknown job '${jobId}'`);
    this.driver.insertIteration({
      id: cryptoRandomId(),
      job_id: jobId,
      iteration,
      prompt,
      response,
      applied_diff: appliedDiff ?? null,
      success: success ? 1 : 0,
      ran_at: Date.now(),
    });
    this.driver.updateJob(jobId, {
      iterations: iteration,
      last_iteration_at: Date.now(),
    });
  }

  complete(jobId) {
    const job = this.driver.getJob(jobId);
    if (!job) throw new Error(`Queue.complete: unknown job '${jobId}'`);
    this.driver.updateJob(jobId, { status: 'done' });
  }

  escalate(jobId, reason) {
    const job = this.driver.getJob(jobId);
    if (!job) throw new Error(`Queue.escalate: unknown job '${jobId}'`);
    this.driver.updateJob(jobId, {
      status: 'escalated',
      last_error: String(reason ?? 'unspecified'),
    });
  }

  fail(jobId, reason) {
    const job = this.driver.getJob(jobId);
    if (!job) throw new Error(`Queue.fail: unknown job '${jobId}'`);
    this.driver.updateJob(jobId, {
      status: 'failed',
      last_error: String(reason ?? 'unspecified'),
    });
  }

  list(filters = {}) {
    return this.driver.list(filters).map(decodeRow);
  }

  iterationsFor(jobId) {
    return this.driver.iterationsFor(jobId);
  }

  /** Queue depth and oldest-queued age (ms) — used by ops.queueHealth. */
  depth() {
    const queued = this.driver.list({ status: 'queued' });
    const running = this.driver.list({ status: 'running' });
    const oldestQueuedAt = queued.length > 0 ? queued[0].created_at : null;
    return {
      queued: queued.length,
      running: running.length,
      oldestQueuedAgeMs: oldestQueuedAt ? Date.now() - oldestQueuedAt : 0,
    };
  }
}

/**
 * createQueue — driver auto-selection. Always returns a memory driver
 * unless a `betterSqlite3` instance is supplied or one can be loaded.
 */
export function createQueue({ path = ':memory:', betterSqlite3 } = {}) {
  if (path === ':memory:' && !betterSqlite3) {
    return new Queue({ driver: new MemoryQueueDriver() });
  }
  // Production path. We do not bundle better-sqlite3 — orchestrator
  // installs it. If it's missing, fall back to memory with a warning.
  if (!betterSqlite3) {
    console.warn(
      '[station] better-sqlite3 not provided; using in-memory queue. ' +
        'Pass `betterSqlite3` from the host runtime for persistence.'
    );
    return new Queue({ driver: new MemoryQueueDriver() });
  }
  // Wrap a better-sqlite3 db with the same surface as MemoryQueueDriver.
  const db = new betterSqlite3(path);
  installSchema(db);
  return new Queue({ driver: sqliteDriver(db) });
}

// ────────────────────────────────────────────────────────────────────
// internals

function decodeRow(row) {
  return {
    id: row.id,
    venture: row.venture,
    intent: row.intent,
    status: row.status,
    payload: row.payload ? JSON.parse(row.payload) : {},
    createdAt: row.created_at,
    iterations: row.iterations,
    maxIterations: row.max_iterations,
    stallThreshold: row.stall_threshold,
    escalateTo: row.escalate_to,
    lastIterationAt: row.last_iteration_at,
    lastError: row.last_error,
  };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'job_' + Math.random().toString(36).slice(2, 12);
}

function installSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS station_jobs (
      id TEXT PRIMARY KEY,
      venture TEXT NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 0,
      max_iterations INTEGER NOT NULL DEFAULT 10,
      stall_threshold INTEGER NOT NULL DEFAULT 3,
      escalate_to TEXT NOT NULL DEFAULT 'sonnet',
      last_iteration_at INTEGER,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS station_iterations (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES station_jobs(id),
      iteration INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      applied_diff TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      ran_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON station_jobs(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_iters_job ON station_iterations(job_id);
  `);
}

function sqliteDriver(db) {
  const insertJobStmt = db.prepare(
    `INSERT INTO station_jobs (id, venture, intent, status, payload, created_at,
       iterations, max_iterations, stall_threshold, escalate_to,
       last_iteration_at, last_error)
     VALUES (@id, @venture, @intent, @status, @payload, @created_at,
       @iterations, @max_iterations, @stall_threshold, @escalate_to,
       @last_iteration_at, @last_error)`
  );
  const getJobStmt = db.prepare(`SELECT * FROM station_jobs WHERE id = ?`);
  const selectQueuedStmt = db.prepare(
    `SELECT * FROM station_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT ?`
  );
  const listStmt = db.prepare(
    `SELECT * FROM station_jobs
       WHERE (@status IS NULL OR status = @status)
         AND (@venture IS NULL OR venture = @venture)
       ORDER BY created_at ASC`
  );
  const insertIterStmt = db.prepare(
    `INSERT INTO station_iterations (id, job_id, iteration, prompt, response,
       applied_diff, success, ran_at)
     VALUES (@id, @job_id, @iteration, @prompt, @response,
       @applied_diff, @success, @ran_at)`
  );
  const itersForStmt = db.prepare(
    `SELECT * FROM station_iterations WHERE job_id = ? ORDER BY iteration ASC`
  );
  return {
    insertJob: (row) => insertJobStmt.run(row),
    updateJob: (id, patch) => {
      const keys = Object.keys(patch);
      if (keys.length === 0) return true;
      const sql = `UPDATE station_jobs SET ${keys.map((k) => `${k} = @${k}`).join(', ')} WHERE id = @id`;
      const stmt = db.prepare(sql);
      const info = stmt.run({ ...patch, id });
      return info.changes > 0;
    },
    getJob: (id) => getJobStmt.get(id) ?? null,
    selectQueued: (limit) => selectQueuedStmt.all(limit),
    list: ({ status, venture } = {}) => listStmt.all({ status: status ?? null, venture: venture ?? null }),
    insertIteration: (row) => insertIterStmt.run(row),
    iterationsFor: (jobId) => itersForStmt.all(jobId),
  };
}

export const QUEUE_STATUSES = STATUSES;
