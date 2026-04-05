# @basenative/upload

> File upload middleware with local, S3, and Cloudflare R2 storage adapters

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/upload
```

## Quick Start

```js
import { createUploadHandler, createLocalStorage } from '@basenative/upload';
import { createPipeline } from '@basenative/middleware';

const storage = createLocalStorage({ directory: './uploads' });

const upload = createUploadHandler(storage, {
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  fieldName: 'avatar',
});

const pipeline = createPipeline().use(upload);
// ctx.state.uploads contains the uploaded file metadata
```

## S3 / R2

```js
import { createS3Storage } from '@basenative/upload';

const storage = createS3Storage({
  bucket: 'my-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// For Cloudflare R2
import { createR2Storage } from '@basenative/upload';
const storage = createR2Storage({ binding: env.MY_BUCKET });
```

## API

### `parseMultipart(body, contentType)`

Parses a `multipart/form-data` request body. Returns an array of part objects:
`{ name, filename, contentType, data, size }`.

### `createUploadHandler(storage, options?)`

Creates an upload middleware. Options:

- `maxFileSize` — Maximum file size in bytes (default: 10 MB).
- `allowedTypes` — Array of allowed MIME types (empty = all allowed).
- `fieldName` — Form field name to read (default: `'file'`).
- `generateFilename(original)` — Function to generate a storage filename. Default: 16-byte hex prefix + original name.

After the middleware runs, `ctx.state.uploads` contains an array of `{ field, filename, url, size, contentType }` objects.

### Storage Adapters

- `createLocalStorage(options)` — Stores files on the local filesystem. Options: `directory`.
  - `.put(filename, data, contentType)` — Stores a file. Returns `{ url }`.
  - `.delete(filename)` — Deletes a file.
- `createS3Storage(options)` — Stores files in AWS S3. Options: `bucket`, `region`, `accessKeyId`, `secretAccessKey`, `prefix`.
- `createR2Storage(options)` — Stores files in Cloudflare R2. Options: `binding` (the R2 binding from Workers env), `prefix`.

## License

MIT
