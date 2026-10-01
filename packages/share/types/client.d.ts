// Built with BaseNative — basenative.dev

export interface ShareResult {
  status: 'shared' | 'copied' | 'failed';
  error?: Error;
}
export function nativeShare(payload: {
  text?: string;
  url?: string;
  title?: string;
  files?: File[];
}): Promise<ShareResult>;

export function mintShareCard(
  payload: Record<string, any>,
  opts?: { endpoint?: string; fetch?: typeof fetch; headers?: Record<string, string> }
): Promise<{ id: string; url: string }>;

export function composeShareText(template: string, vars?: Record<string, any>): string;
