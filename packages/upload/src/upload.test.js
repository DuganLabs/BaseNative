import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseMultipart, createUploadHandler } from './handler.js';
import { createLocalStorage } from './storage/local.js';
import { createS3Storage } from './storage/s3.js';
import { createR2Storage } from './storage/r2.js';

// ---- helpers ----

function buildMultipartBody(boundary, parts) {
  const lines = [];
  for (const p of parts) {
    lines.push(`--${boundary}\r\n`);
    let disp = `Content-Disposition: form-data; name="${p.name}"`;
    if (p.filename) disp += `; filename="${p.filename}"`;
    lines.push(disp + '\r\n');
    if (p.contentType) lines.push(`Content-Type: ${p.contentType}\r\n`);
    lines.push('\r\n');
    lines.push(p.value + '\r\n');
  }
  lines.push(`--${boundary}--`);
  return lines.join('');
}

// ---- parseMultipart ----

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

  it('returns empty when content-type is missing', () => {
    assert.deepEqual(parseMultipart('hello', undefined), []);
  });

  it('returns empty when content-type has no boundary', () => {
    assert.deepEqual(parseMultipart('hello', 'multipart/form-data'), []);
  });

  it('correctly parses content-type from file part', () => {
    const boundary = 'testbound';
    const body = buildMultipartBody(boundary, [
      { name: 'upload', filename: 'img.png', contentType: 'image/png', value: 'binarydata' },
    ]);
    const parts = parseMultipart(body, `multipart/form-data; boundary=${boundary}`);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].contentType, 'image/png');
    assert.equal(parts[0].filename, 'img.png');
  });

  it('returns application/octet-stream as default content-type for parts without one', () => {
    const boundary = 'testbound2';
    const body = buildMultipartBody(boundary, [
      { name: 'upload', filename: 'data.bin', value: 'raw' },
    ]);
    const parts = parseMultipart(body, `multipart/form-data; boundary=${boundary}`);
    assert.equal(parts[0].contentType, 'application/octet-stream');
  });

  it('filters parts with no name', () => {
    // manually build a body with a nameless part
    const boundary = 'nb';
    const body = `--nb\r\nContent-Disposition: form-data\r\n\r\norphan\r\n--nb--`;
    const parts = parseMultipart(body, `multipart/form-data; boundary=nb`);
    assert.equal(parts.length, 0);
  });

  it('correctly reports part size in bytes', () => {
    const boundary = 'sizebound';
    const value = 'hello';
    const body = buildMultipartBody(boundary, [
      { name: 'f', filename: 'f.txt', contentType: 'text/plain', value },
    ]);
    const parts = parseMultipart(body, `multipart/form-data; boundary=${boundary}`);
    assert.equal(parts[0].size, Buffer.byteLength(value, 'binary'));
  });

  it('handles quoted boundary in content-type', () => {
    const boundary = 'quoted-bound';
    const body = buildMultipartBody(boundary, [
      { name: 'field', value: 'data' },
    ]);
    const parts = parseMultipart(body, `multipart/form-data; boundary="${boundary}"`);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].name, 'field');
  });
});

// ---- createLocalStorage ----

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

  it('returns false for exists on missing file', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    assert.equal(await storage.exists('ghost.txt'), false);
  });

  it('put returns correct size and contentType in result', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir, baseUrl: '/assets' });
    const buf = Buffer.from('content');
    const result = await storage.put('doc.txt', buf, { contentType: 'text/plain' });
    assert.equal(result.size, buf.length);
    assert.equal(result.contentType, 'text/plain');
    assert.equal(result.url, '/assets/doc.txt');
  });

  it('delete is a no-op for non-existent file', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    await assert.doesNotReject(() => storage.delete('no-file.txt'));
  });
});

// ---- createS3Storage ----

describe('createS3Storage', () => {
  it('throws when client is missing', () => {
    assert.throws(() => createS3Storage({ bucket: 'my-bucket' }), /S3 storage requires/);
  });

  it('throws when bucket is missing', () => {
    assert.throws(() => createS3Storage({ client: {} }), /S3 storage requires/);
  });

  it('put calls client.putObject with correct params', async () => {
    const calls = [];
    const client = {
      putObject(params) { calls.push(params); return Promise.resolve(); },
    };
    const storage = createS3Storage({ client, bucket: 'test-bucket', baseUrl: 'https://cdn.example.com' });
    const result = await storage.put('photo.jpg', Buffer.from('img'), { contentType: 'image/jpeg' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].Bucket, 'test-bucket');
    assert.equal(calls[0].Key, 'photo.jpg');
    assert.equal(calls[0].ContentType, 'image/jpeg');
    assert.equal(result.key, 'photo.jpg');
    assert.equal(result.url, 'https://cdn.example.com/photo.jpg');
  });

  it('put uses prefix in key when prefix is set', async () => {
    const calls = [];
    const client = {
      putObject(params) { calls.push(params); return Promise.resolve(); },
    };
    const storage = createS3Storage({ client, bucket: 'b', prefix: 'uploads' });
    await storage.put('file.txt', Buffer.from('x'), {});
    assert.equal(calls[0].Key, 'uploads/file.txt');
  });

  it('exists returns true when headObject resolves', async () => {
    const client = {
      headObject() { return Promise.resolve({}); },
    };
    const storage = createS3Storage({ client, bucket: 'b' });
    assert.equal(await storage.exists('file.txt'), true);
  });

  it('exists returns false when headObject throws', async () => {
    const client = {
      headObject() { return Promise.reject(new Error('NotFound')); },
    };
    const storage = createS3Storage({ client, bucket: 'b' });
    assert.equal(await storage.exists('file.txt'), false);
  });

  it('get returns response.Body from client.getObject', async () => {
    const fakeBody = Buffer.from('s3-content');
    const client = {
      getObject() { return Promise.resolve({ Body: fakeBody }); },
    };
    const storage = createS3Storage({ client, bucket: 'b' });
    const result = await storage.get('doc.txt');
    assert.equal(result, fakeBody);
  });

  it('delete calls client.deleteObject', async () => {
    const calls = [];
    const client = {
      deleteObject(params) { calls.push(params); return Promise.resolve(); },
    };
    const storage = createS3Storage({ client, bucket: 'b' });
    await storage.delete('old.txt');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].Key, 'old.txt');
  });
});

// ---- createR2Storage ----

describe('createR2Storage', () => {
  it('throws when bucket is not provided', () => {
    assert.throws(() => createR2Storage({}), /R2 storage requires/);
  });

  it('throws when bucket binding is invalid', () => {
    assert.throws(() => createR2Storage({ bucket: {} }), /R2 storage requires/);
  });

  it('put calls bucket.put and returns correct result', async () => {
    const calls = [];
    const bucket = {
      put(key, data, opts) { calls.push({ key, data, opts }); return Promise.resolve(); },
    };
    const storage = createR2Storage({ bucket, baseUrl: 'https://r2.example.com' });
    const result = await storage.put('image.png', Buffer.from('px'), { contentType: 'image/png', originalName: 'image.png' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].key, 'image.png');
    assert.equal(result.url, 'https://r2.example.com/image.png');
    assert.equal(result.key, 'image.png');
    assert.equal(result.contentType, 'image/png');
  });

  it('get returns arrayBuffer from bucket.get result', async () => {
    const fakeBuffer = Buffer.from('r2-data');
    const bucket = {
      put() { return Promise.resolve(); },
      get() { return Promise.resolve({ arrayBuffer: () => Promise.resolve(fakeBuffer) }); },
    };
    const storage = createR2Storage({ bucket });
    const result = await storage.get('data.bin');
    assert.equal(result, fakeBuffer);
  });

  it('get returns null when bucket.get returns null', async () => {
    const bucket = {
      put() { return Promise.resolve(); },
      get() { return Promise.resolve(null); },
    };
    const storage = createR2Storage({ bucket });
    const result = await storage.get('missing.bin');
    assert.equal(result, null);
  });

  it('exists returns true when bucket.head returns non-null', async () => {
    const bucket = {
      put() { return Promise.resolve(); },
      head() { return Promise.resolve({ size: 100 }); },
    };
    const storage = createR2Storage({ bucket });
    assert.equal(await storage.exists('file.txt'), true);
  });

  it('exists returns false when bucket.head returns null', async () => {
    const bucket = {
      put() { return Promise.resolve(); },
      head() { return Promise.resolve(null); },
    };
    const storage = createR2Storage({ bucket });
    assert.equal(await storage.exists('file.txt'), false);
  });
});

// ---- createUploadHandler ----

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

  it('skips GET requests', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage);
    const ctx = {
      request: { method: 'GET', headers: { 'content-type': 'multipart/form-data; boundary=x' } },
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

  it('rejects files with disallowed content type', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage, { allowedTypes: ['image/png'] });
    const boundary = 'bnd';
    const body = buildMultipartBody(boundary, [
      { name: 'file', filename: 'doc.pdf', contentType: 'application/pdf', value: 'pdf-content' },
    ]);
    const ctx = {
      request: { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body },
      state: {},
    };
    await handler(ctx, async () => {});
    assert.equal(ctx.state.files.length, 0);
    assert.equal(ctx.state.uploadErrors.length, 1);
    assert.ok(ctx.state.uploadErrors[0].error.includes('not allowed'));
  });

  it('accepts files matching allowed types', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage, {
      allowedTypes: ['image/png'],
      generateFilename: (orig) => `fixed-${orig}`,
    });
    const boundary = 'bnd2';
    const body = buildMultipartBody(boundary, [
      { name: 'file', filename: 'photo.png', contentType: 'image/png', value: 'PNG' },
    ]);
    const ctx = {
      request: { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body },
      state: {},
    };
    await handler(ctx, async () => {});
    assert.equal(ctx.state.files.length, 1);
    assert.equal(ctx.state.uploadErrors.length, 0);
    assert.equal(ctx.state.files[0].originalName, 'photo.png');
  });

  it('populates ctx.state.fields for non-file parts', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage, {
      generateFilename: (orig) => orig,
    });
    const boundary = 'bnd3';
    const body = buildMultipartBody(boundary, [
      { name: 'username', value: 'alice' },
      { name: 'file', filename: 'a.txt', contentType: 'text/plain', value: 'data' },
    ]);
    const ctx = {
      request: { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body },
      state: {},
    };
    await handler(ctx, async () => {});
    assert.equal(ctx.state.fields.username, 'alice');
    assert.equal(ctx.state.files.length, 1);
  });

  it('accepts PUT requests with multipart body', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'bn-upload-'));
    const storage = createLocalStorage({ directory: tempDir });
    const handler = createUploadHandler(storage, { generateFilename: (orig) => orig });
    const boundary = 'put-bnd';
    const body = buildMultipartBody(boundary, [
      { name: 'file', filename: 'update.txt', contentType: 'text/plain', value: 'updated' },
    ]);
    const ctx = {
      request: { method: 'PUT', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body },
      state: {},
    };
    await handler(ctx, async () => {});
    assert.equal(ctx.state.files.length, 1);
  });
});
