import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Local filesystem storage adapter.
 */
export function createLocalStorage(options = {}) {
  const { directory = './uploads', baseUrl = '/uploads' } = options;

  mkdirSync(directory, { recursive: true });

  return {
    async put(filename, data, metadata = {}) {
      const filePath = join(directory, filename);
      writeFileSync(filePath, data);
      return {
        key: filename,
        url: `${baseUrl}/${filename}`,
        size: data.length,
        contentType: metadata.contentType,
      };
    },

    async get(filename) {
      const filePath = join(directory, filename);
      if (!existsSync(filePath)) return null;
      return readFileSync(filePath);
    },

    async delete(filename) {
      const filePath = join(directory, filename);
      if (existsSync(filePath)) unlinkSync(filePath);
    },

    async exists(filename) {
      return existsSync(join(directory, filename));
    },
  };
}
