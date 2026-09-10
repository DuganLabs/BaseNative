import { TOOLS, TOOL_MAP } from './tools.js';

export const PROTOCOL_VERSION = '2024-11-05';
export const SERVER_INFO = { name: 'basenative', version: '0.1.0' };

const parseError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });

/**
 * Handle one JSON-RPC message and return the response, or null for a notification.
 *
 * Implemented directly against the wire protocol rather than via an SDK: MCP is
 * JSON-RPC 2.0 over stdio, and BaseNative ships zero production dependencies.
 */
export function handleMessage(msg) {
  if (!msg || msg.jsonrpc !== '2.0') return parseError(msg?.id ?? null, -32600, 'Invalid Request');

  const { id, method, params } = msg;
  // Notifications have no id and expect no response.
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
      return null;

    case 'tools/list':
      return ok(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });

    case 'tools/call': {
      const tool = TOOL_MAP.get(params?.name);
      if (!tool) return parseError(id, -32602, `Unknown tool: ${params?.name}`);

      // Enforce the schema's required arguments. Without this a missing argument
      // reaches the handler as undefined and can produce a confidently wrong answer
      // — check_expression with no expression would report "INSIDE SUBSET".
      const args = params.arguments ?? {};
      const missing = (tool.inputSchema.required ?? []).filter(
        (key) => args[key] === undefined || args[key] === null
      );
      if (missing.length > 0) {
        return ok(id, {
          content: [
            {
              type: 'text',
              text: `Missing required argument(s) for "${tool.name}": ${missing.join(', ')}.`,
            },
          ],
          isError: true,
        });
      }

      try {
        const { text, isError } = tool.handler(args);
        return ok(id, { content: [{ type: 'text', text }], isError: Boolean(isError) });
      } catch (err) {
        return ok(id, {
          content: [{ type: 'text', text: `Tool "${tool.name}" failed: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return ok(id, {});

    default:
      if (isNotification) return null;
      return parseError(id, -32601, `Method not found: ${method}`);
  }
}

/**
 * Run the stdio loop. Messages are newline-delimited JSON, which is what the
 * Claude Code / MCP stdio transport emits.
 */
export function serve({ input = process.stdin, output = process.stdout } = {}) {
  let buffer = '';
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let response;
      try {
        response = handleMessage(JSON.parse(line));
      } catch {
        response = parseError(null, -32700, 'Parse error');
      }
      if (response) output.write(JSON.stringify(response) + '\n');
    }
  });
}
