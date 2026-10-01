// Built with BaseNative — basenative.dev

export interface RequiredSecret {
  name: string;
  description?: string;
  required?: boolean;
}

export interface RequiredSchema {
  secrets: RequiredSecret[];
  configs: string[];
}

export function loadRequired(filePath: string): RequiredSchema;
export function validateRequired(input: unknown): RequiredSchema;
export function findMissing(
  schema: RequiredSchema,
  env: Record<string, string | undefined>,
): string[];

export class ValidationError extends Error {
  readonly name: 'ValidationError';
  readonly errors: string[];
  readonly code: 'E_INVALID_REQUIRED';
  constructor(errors: string[]);
}
