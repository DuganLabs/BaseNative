# @basenative/upload

> Multipart file upload handling with local, S3-compatible, and Cloudflare R2 storage adapters.

## Overview

`@basenative/upload` parses `multipart/form-data` request bodies and routes file uploads to a pluggable storage backend. The upload handler middleware validates file size and content type before storing, and attaches results to `ctx.state.files`. Storage adapters share a common interface (`put`, `get`, `delete`, `exists`) so backends are interchangeable.

## Installation

```bash
npm install @basenative/upload
```

## Quick Start

```js
import { createUploadHandler, createLocalStorage } from '@basenative/upload';

const storage = createLocalStorage({ directory: './uploads' });

const upload = createUploadHandler(storage, {
  maxFileSize: 5 * 1024 * 1024,          // 5 MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
});

// In a middleware pipeline:
pipeline.use(upload);

// In a route handler after the upload middleware:
const [file] = ctx.state.files;
console.log(file.url, file.originalName, file.size);
```

## API Reference

### createUploadHandler(storage, options)

Creates an upload middleware that parses multipart requests and stores files.

**Parameters:**
- `storage` — storage adapter instance (local, S3, or R2)
- `options.maxFileSize` — maximum bytes per file; default `10485760` (10 MB)
- `options.allowedTypes` — array of allowed MIME types; empty array allows all types
- `options.fieldName` — form field name to process; default `'file'`
- `options.generateFilename(originalName)` — function to generate the stored filename; default prepends 16 random hex bytes

**Returns:** Middleware function `(ctx, next) => Promise<void>`.

This middleware only processes `POST` and `PUT` requests with a `multipart/form-data` content type. Other requests pass through to `next` unchanged.

After the middleware runs:
- `ctx.state.files` — array of uploaded file objects: `{ key, url, size, contentType, originalName, fieldName }`
- `ctx.state.uploadErrors` — array of `{ file, error }` for files that failed validation
- `ctx.state.fields` — object of non-file form fields: `{ [name]: value }`

---

### parseMultipart(body, contentType)

Parses a raw multipart request body into parts.

**Parameters:**
- `body` — request body as `Buffer` or string
- `contentType` — value of the `Content-Type` header (must contain `boundary=`)

**Returns:** Array of part objects: `{ name, filename, contentType, data, size }`.

Parts without a `filename` attribute are non-file fields. Parts with `filename` are file uploads.

**Example:**
```js
const parts = parseMultipart(req.body, req.headers['content-type']);
const files = parts.filter(p => p.filename);
const fields = parts.filter(p => !p.filename);
```

---

### createLocalStorage(options)

Storage adapter that writes files to the local filesystem.

**Parameters:**
- `options.directory` — directory path for uploaded files
- `options.baseUrl` — URL prefix for constructing file URLs; default `'/uploads'`

**Returns:** Storage adapter with `put`, `get`, `delete`, `exists`.

---

### createS3Storage(options)

Storage adapter for AWS S3 or any S3-compatible service (MinIO, DigitalOcean Spaces, etc.).

**Parameters:**
- `options.client` — an AWS SDK v3 S3 client instance (required)
- `options.bucket` — S3 bucket name (required)
- `options.prefix` — key prefix for all stored objects; default `''`
- `options.baseUrl` — URL prefix for constructing public file URLs; default uses `https://<bucket>.s3.amazonaws.com`

**Returns:** Storage adapter with `put`, `get`, `delete`, `exists`.

**Example:**
```js
import { S3Client } from '@aws-sdk/client-s3';
import { createS3Storage } from '@basenative/upload';

const storage = createS3Storage({
  client: new S3Client({ region: 'us-east-1' }),
  bucket: 'my-uploads',
  prefix: 'avatars',
});
```

---

### createR2Storage(options)

Storage adapter for Cloudflare R2. Accepts a Cloudflare Workers R2 bucket binding.

**Parameters:**
- `options.bucket` — R2 bucket binding from the Workers environment (required)
- `options.prefix` — key prefix; default `''`
- `options.baseUrl` — URL prefix for public file URLs

**Returns:** Storage adapter with `put`, `get`, `delete`, `exists`.

## Storage Adapter Interface

All storage adapters implement the same interface:

```js
{
  put(filename, data, metadata)  // => Promise<{ key, url, size, contentType }>
  get(filename)                  // => Promise<Buffer | ReadableStream>
  delete(filename)               // => Promise<void>
  exists(filename)               // => Promise<boolean>
}
```

## Integration

Register the upload middleware before route handlers in a `@basenative/middleware` pipeline. Access `ctx.state.files` in the route handler. Combine with `@basenative/tenant` to store files under a tenant-scoped key prefix.

```js
import { createPipeline } from '@basenative/middleware';
import { createUploadHandler, createS3Storage } from '@basenative/upload';

const pipeline = createPipeline()
  .use(createUploadHandler(storage, { maxFileSize: 20 * 1024 * 1024 }));
```
