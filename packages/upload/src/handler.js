import { randomBytes } from 'node:crypto';

/**
 * Parse multipart/form-data from a request body buffer.
 * Simple parser for the common case — not a full multipart parser.
 */
export function parseMultipart(body, contentType) {
  const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  if (!boundaryMatch) return [];

  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const raw = typeof body === 'string' ? body : body.toString('utf-8');
  const parts = raw.split(`--${boundary}`).slice(1, -1);

  return parts.map(part => {
    const [headerSection, ...bodyParts] = part.split('\r\n\r\n');
    const bodyContent = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
    const headers = {};

    for (const line of headerSection.split('\r\n')) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) headers[match[1].toLowerCase()] = match[2];
    }

    const disposition = headers['content-disposition'] ?? '';
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    return {
      name: nameMatch?.[1] ?? '',
      filename: filenameMatch?.[1] ?? null,
      contentType: headers['content-type'] ?? 'application/octet-stream',
      data: Buffer.from(bodyContent, 'binary'),
      size: Buffer.byteLength(bodyContent, 'binary'),
    };
  }).filter(p => p.name);
}

/**
 * Create an upload handler middleware.
 *
 * @param {object} storage - Storage adapter (local, S3, R2)
 * @param {object} [options]
 */
export function createUploadHandler(storage, options = {}) {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = [],
    fieldName: _fieldName = 'file',
    generateFilename = (original) => `${randomBytes(16).toString('hex')}-${original}`,
  } = options;

  return async (ctx, next) => {
    if (ctx.request.method !== 'POST' && ctx.request.method !== 'PUT') {
      await next();
      return;
    }

    const contentType = ctx.request.headers?.['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      await next();
      return;
    }

    const parts = parseMultipart(ctx.request.body, contentType);
    const files = parts.filter(p => p.filename);
    const fields = parts.filter(p => !p.filename);

    const uploaded = [];
    const errors = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        errors.push({ file: file.filename, error: `File exceeds max size of ${maxFileSize} bytes` });
        continue;
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.contentType)) {
        errors.push({ file: file.filename, error: `Type ${file.contentType} not allowed` });
        continue;
      }

      const storedName = generateFilename(file.filename);
      const result = await storage.put(storedName, file.data, {
        contentType: file.contentType,
        originalName: file.filename,
        size: file.size,
      });

      uploaded.push({ ...result, originalName: file.filename, fieldName: file.name });
    }

    ctx.state.files = uploaded;
    ctx.state.uploadErrors = errors;
    ctx.state.fields = Object.fromEntries(fields.map(f => [f.name, f.data.toString('utf-8')]));

    await next();
  };
}
