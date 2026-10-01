// Built with BaseNative — basenative.dev

export function renderAdminQueueList(opts: {
  items: Array<{ id: number | string; category: string; phrase: string; submittedBy: string }>;
  approveLabel?: string;
  rejectLabel?: string;
  emptyLabel?: string;
  actionHandler?: string;
}): string;

export function renderAdminUserList(opts: {
  users: Array<{ id: string; handle: string; role: string }>;
  results?: Array<{ id: string; handle: string; role: string }> | null;
  query?: string;
  currentHandle?: string;
  roles?: string[];
  labels?: { search?: string; currentSection?: string; resultsSection?: string; none?: string };
  actionHandler?: string;
  searchHandler?: string;
}): string;
