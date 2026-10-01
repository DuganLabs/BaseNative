// Built with BaseNative — basenative.dev

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
}

export function defaultAdapter(opts?: { preferIndexedDb?: boolean }): StorageAdapter;
export function localStorageAdapter(): StorageAdapter | null;
export function memoryAdapter(): StorageAdapter;
export function indexedDbAdapter(opts?: { dbName?: string; store?: string }): StorageAdapter;
