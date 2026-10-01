export interface UploadedFile {
  key: string;
  url: string;
  size: number;
  contentType?: string;
  originalName?: string;
  fieldName?: string;
}

/**
 * `TBody` is what `get` resolves to, which depends on the adapter: the local
 * adapter reads bytes, R2 returns an `ArrayBuffer`, and S3 returns whatever
 * `Body` the supplied client's `getObject` yields.
 */
export interface StorageAdapter<TBody = unknown> {
  put(filename: string, data: Uint8Array, metadata?: Record<string, unknown>): Promise<UploadedFile>;
  get(filename: string): Promise<TBody | null>;
  delete(filename: string): Promise<void>;
  exists(filename: string): Promise<boolean>;
}

export interface MultipartPart {
  name: string;
  /** `null` for a plain form field rather than a file. */
  filename: string | null;
  contentType: string;
  data: Uint8Array;
  size: number;
}

/**
 * A request body that `parseMultipart` can decode: a string, or a byte
 * container whose `toString('utf-8')` returns the decoded text (a Node
 * `Buffer`). A plain `Uint8Array` type-checks here but is not decoded
 * correctly at runtime.
 */
export interface Utf8Decodable {
  toString(encoding: 'utf-8'): string;
}

export function parseMultipart(body: string | Utf8Decodable, contentType: string): MultipartPart[];
export function createUploadHandler(storage: StorageAdapter, options?: {
  maxFileSize?: number;
  allowedTypes?: string[];
  fieldName?: string;
  generateFilename?: (original: string) => string;
}): (ctx: unknown, next: () => Promise<void>) => Promise<void>;

export function createLocalStorage(options?: { directory?: string; baseUrl?: string }): StorageAdapter<Uint8Array>;
export function createS3Storage(options: { client: unknown; bucket: string; prefix?: string; baseUrl?: string }): StorageAdapter;
export function createR2Storage(options: { bucket: unknown; baseUrl?: string }): StorageAdapter<ArrayBuffer>;
