export interface SSEClient {
  id: string;
  metadata: Record<string, unknown>;
}

export interface SSEServerOptions {
  heartbeatInterval?: number;
}

export interface SSEServer {
  addClient(res: unknown, options?: { id?: string; metadata?: Record<string, unknown>; headers?: Record<string, string> }): string;
  removeClient(clientId: string): boolean;
  send(clientId: string, event: string, data: unknown): boolean;
  broadcast(event: string, data: unknown): number;
  getClients(): SSEClient[];
  close(): void;
}

export function createSSEServer(options?: SSEServerOptions): SSEServer;

export function sseMiddleware(sseServer: SSEServer): (req: unknown, res: unknown, next?: () => void) => void;

export interface ChannelManager {
  createChannel(name: string): { name: string; members: Set<string>; metadata: Record<string, unknown> };
  join(channelName: string, clientId: string): boolean;
  leave(channelName: string, clientId: string): boolean;
  broadcast(channelName: string, event: string, data: unknown, sendFn: (clientId: string, event: string, data: unknown) => boolean): number;
  getMembers(channelName: string): string[];
  deleteChannel(channelName: string): boolean;
  getChannels(): string[];
  removeFromAll(clientId: string): number;
}

export function createChannelManager(): ChannelManager;

export interface WSConnection {
  id: string;
  ws: unknown;
  alive: boolean;
  metadata: { url?: string; headers?: Record<string, string> };
}

export interface WSHandlerOptions {
  onConnect?: (conn: WSConnection) => void;
  onMessage?: (conn: WSConnection, data: unknown) => void;
  onClose?: (conn: WSConnection, code?: number, reason?: unknown) => void;
  onError?: (conn: WSConnection, err: Error) => void;
  heartbeatInterval?: number;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxRetries?: number;
  parseJSON?: boolean;
}

export interface WSHandler {
  handleConnection(ws: unknown, req?: unknown): WSConnection;
  send(connectionId: string, data: unknown): boolean;
  broadcast(data: unknown): number;
  getConnections(): Array<{ id: string; alive: boolean; metadata: Record<string, unknown> }>;
  startHeartbeat(): void;
  stopHeartbeat(): void;
  close(): void;
  readonly config: {
    heartbeatInterval: number;
    reconnect: boolean;
    reconnectInterval: number;
    reconnectMaxRetries: number;
    parseJSON: boolean;
  };
}

export function createWSHandler(options?: WSHandlerOptions): WSHandler;
