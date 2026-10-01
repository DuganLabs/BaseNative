export interface ToolResult {
  text: string;
  isError?: boolean;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  handler(args?: Record<string, unknown>): ToolResult;
}

export const TOOLS: Tool[];
export const TOOL_MAP: Map<string, Tool>;

export interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: unknown;
  result: unknown;
}

export interface JsonRpcError {
  jsonrpc: '2.0';
  id: unknown;
  error: { code: number; message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

export const PROTOCOL_VERSION: '2024-11-05';
export const SERVER_INFO: { name: string; version: string };

/**
 * Handle one JSON-RPC 2.0 message. Returns the response, or `null` for a
 * notification. A message that is not a JSON-RPC 2.0 object yields an
 * "Invalid Request" error response.
 */
export function handleMessage(msg: unknown): JsonRpcResponse | null;

/** The stdin-like stream `serve` reads newline-delimited JSON from. */
export interface ServeInput {
  setEncoding(encoding: string): unknown;
  on(event: 'data', listener: (chunk: string) => void): unknown;
}

/** The stdout-like stream `serve` writes responses to. */
export interface ServeOutput {
  write(chunk: string): unknown;
}

export interface ServeOptions {
  /** Defaults to `process.stdin`. */
  input?: ServeInput;
  /** Defaults to `process.stdout`. */
  output?: ServeOutput;
}

/** Run the MCP stdio loop: newline-delimited JSON-RPC in, newline-delimited JSON-RPC out. */
export function serve(options?: ServeOptions): void;

export interface DirectiveReference {
  /** Directive name including its prefix, e.g. `@for`. */
  name: string;
  /** Where it applies: `template`, `element`, or `text or attribute value`. */
  on: string;
  signature: string;
  summary: string;
  example: string;
  notes: string;
}

export interface PrimitiveReference {
  name: string;
  signature: string;
  summary: string;
}

export interface ForbiddenSyntax {
  /** The foreign syntax that BaseNative does not accept. */
  foreign: string;
  framework: string;
  /** The BaseNative form to use instead. */
  use: string;
}

export const DIRECTIVES: DirectiveReference[];
export const PRIMITIVES: PrimitiveReference[];
export const FORBIDDEN: ForbiddenSyntax[];
