/**
 * S3-compatible storage adapter.
 * Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 * Requires the user to pass an S3 client instance.
 */
export function createS3Storage(options = {}) {
  const { client, bucket, prefix = '', baseUrl } = options;

  if (!client || !bucket) {
    throw new Error('S3 storage requires client and bucket options');
  }

  function getKey(filename) {
    return prefix ? `${prefix}/${filename}` : filename;
  }

  return {
    async put(filename, data, metadata = {}) {
      const key = getKey(filename);
      await client.putObject({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: metadata.contentType,
      });
      const url = baseUrl ? `${baseUrl}/${key}` : `https://${bucket}.s3.amazonaws.com/${key}`;
      return { key, url, size: data.length, contentType: metadata.contentType };
    },

    async get(filename) {
      const key = getKey(filename);
      const response = await client.getObject({ Bucket: bucket, Key: key });
      return response.Body;
    },

    async delete(filename) {
      const key = getKey(filename);
      await client.deleteObject({ Bucket: bucket, Key: key });
    },

    async exists(filename) {
      const key = getKey(filename);
      try {
        await client.headObject({ Bucket: bucket, Key: key });
        return true;
      } catch {
        return false;
      }
    },
  };
}
