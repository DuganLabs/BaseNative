import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseMultipart, createUploadHandler } from './handler.js';
import { createLocalStorage } from './storage/local.js';

describe('parseMultipart', () => {
  it('parses simple multipart body', () => {
    const boundary = '----boundary';
    const body = `------boundary\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n------boundary\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nhello world\r\n------boundary--`;
    const parts = parseMultipart(body, `multipart/form-data; boundary=----boundary`);
    assert.equal(parts.length, 2);
    assert.equal(parts[0].name, 'field1');
    assert.equal(parts[0].filename, null);
    assert.equal(parts[1].name, 'file');
    assert.equal(parts[1].filename, 'test.txt');
  });

  it('returns empty for non-multipart', () => {
    assert.deepEqual(parseMultipart('hello', 'text/plain'), []);
  });
});

describe('createLocalStorage', () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  });

  it('stores and retrieves files', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir, baseUrl: '/files' });

    const result = await storage.put('test.txt', Buffer.from('hello'), { contentType: 'text/plain' });
    assert.equal(result.key, 'test.txt');
    assert.equal(result.url, '/files/test.txt');

    const data = await storage.get('test.txt');
    assert.equal(data.toString(), 'hello');
  });

  it('deletes files', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });

    await storage.put('delete-me.txt', Buffer.from('data'));
    assert.ok(await storage.exists('delete-me.txt'));
    await storage.delete('delete-me.txt');
    assert.ok(!(await storage.exists('delete-me.txt')));
  });

  it('returns null for missing files', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    assert.equal(await storage.get('nonexistent'), null);
  });
});

describe('createUploadHandler', () => {
  let tempDir;

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  });

  it('skips non-multipart requests', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage);
    const ctx = {
      request: { method: 'POST', headers: { 'content-type': 'application/json' } },
      response: { headers: {} },
      state: {},
    };
    let nextCalled = false;
    await handler(ctx, async () => { nextCalled = true; });
    assert.ok(nextCalled);
    assert.equal(ctx.state.files, undefined);
  });

  it('rejects files exceeding max size', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage, { maxFileSize: 5 });
    const boundary = '----boundary';
    const body = `------boundary\r\nContent-Disposition: form-data; name="file"; filename="big.txt"\r\nContent-Type: text/plain\r\n\r\nhello world too large\r\n------boundary--`;
    const ctx = {
      request: { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=----boundary` }, body },
      response: { headers: {} },
      state: {},
    };
    await handler(ctx, async () => {});
    assert.equal(ctx.state.files.length, 0);
    assert.equal(ctx.state.uploadErrors.length, 1);
  });
});
