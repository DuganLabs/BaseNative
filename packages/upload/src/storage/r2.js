/**
 * Cloudflare R2 storage adapter.
 * Wraps the R2 binding available in Workers/Pages environments.
 */
export function createR2Storage(options = {}) {
  const { bucket, baseUrl = '' } = options;

  if (!bucket || typeof bucket.put !== 'function') {
    throw new Error('R2 storage requires a valid R2 bucket binding');
  }

  return {
    async put(filename, data, metadata = {}) {
      await bucket.put(filename, data, {
        httpMetadata: { contentType: metadata.contentType },
        customMetadata: { originalName: metadata.originalName ?? filename },
      });
      const url = baseUrl ? `${baseUrl}/${filename}` : filename;
      return { key: filename, url, size: data.length, contentType: metadata.contentType };
    },

    async get(filename) {
      const object = await bucket.get(filename);
      if (!object) return null;
      return await object.arrayBuffer();
    },

    async delete(filename) {
      await bucket.delete(filename);
    },

    async exists(filename) {
      const head = await bucket.head(filename);
      return head !== null;
    },
  };
}
