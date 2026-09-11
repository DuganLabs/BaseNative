export type UpdateKind = 'soft' | 'style' | 'hard';

export const HMR_BASE: string;

export const ROUTES: {
  client: string;
  patch: string;
  preserve: string;
  protocol: string;
  stream: string;
  status: string;
};

export const CLIENT_MARKER: string;
export const SKIP_ATTR: string;
export const PATCH_HEADER: string;

export const UPDATE: { soft: 'soft'; style: 'style'; hard: 'hard' };

export const EVENTS: {
  beforePatch: 'bn:hmr:before-patch';
  patched: 'bn:hmr:patched';
  reload: 'bn:hmr:reload';
};

export function classifyChange(file: string): UpdateKind;
export function classifyBatch(files: string[] | undefined): UpdateKind;
