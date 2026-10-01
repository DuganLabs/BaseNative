// Built with BaseNative — basenative.dev

export interface QueueTablesConfig {
  submissions: string;
  target: string;
  columns?: string[];
}
export interface QueueDecideResult {
  id: number | string;
  status: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: number;
}
export interface QueueStore {
  listPending(limit?: number): Promise<any[]>;
  submit(payload: Record<string, any>): Promise<{ id: any; status: string; submittedBy: string; createdAt: number }>;
  decide(id: number | string, status: 'approved' | 'rejected', decidedBy: string): Promise<QueueDecideResult | null>;
  get(id: number | string): Promise<any | null>;
}
export function defineQueue(opts: {
  db: any;
  tables: QueueTablesConfig;
  now?: () => number;
  onApprove?: (row: any, ctx: { db: any }) => Promise<void>;
}): QueueStore;
