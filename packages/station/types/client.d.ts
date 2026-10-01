// Built with BaseNative — basenative.dev

export interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface ChatResponse {
  text: string;
  usage: object | null;
  latencyMs: number;
  source: 'primary' | 'fallback';
}

export interface ClientOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  fallbackUrl?: string;
  fallbackModel?: string;
  fallbackApiKey?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class OpenAICompatClient {
  constructor(opts: ClientOptions);
  baseUrl: string;
  model: string;
  fallbackUrl: string | null;
  timeoutMs: number;
  chat(req: ChatRequest): Promise<ChatResponse>;
  ping(): Promise<{ ok: boolean; status?: number; models?: string[]; hasExpectedModel?: boolean; error?: string }>;
  health(): Promise<{ ok: boolean; status?: number; error?: string }>;
}

export const Client: typeof OpenAICompatClient;

export class StationUnavailable extends Error {
  primary?: unknown;
  fallback?: unknown;
}

export class StationTimeout extends Error {}
