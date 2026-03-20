export interface UploadedFile {
  key: string;
  url: string;
  size: number;
  contentType?: string;
  originalName?: string;
  fieldName?: string;
}

export interface StorageAdapter {
  put(filename: string, data: Buffer, metadata?: Record<string, unknown>): Promise<UploadedFile>;
  get(filename: string): Promise<Buffer | null>;
  delete(filename: string): Promise<void>;
  exists(filename: string): Promise<boolean>;
}

export interface MultipartPart {
  name: string;
  filename: string | null;
  contentType: string;
  data: Buffer;
  size: number;
}

export function parseMultipart(body: string | Buffer, contentType: string): MultipartPart[];
export function createUploadHandler(storage: StorageAdapter, options?: {
  maxFileSize?: number;
  allowedTypes?: string[];
  fieldName?: string;
  generateFilename?: (original: string) => string;
}): (ctx: unknown, next: () => Promise<void>) => Promise<void>;

export function createLocalStorage(options?: { directory?: string; baseUrl?: string }): StorageAdapter;
export function createS3Storage(options: { client: unknown; bucket: string; prefix?: string; baseUrl?: string }): StorageAdapter;
export function createR2Storage(options: { bucket: unknown; baseUrl?: string }): StorageAdapter;
