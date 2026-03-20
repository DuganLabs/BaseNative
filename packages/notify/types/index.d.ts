// --- Email ---

export interface EmailResult {
  html: string;
  text: string;
}

export function renderEmail(
  template: string,
  data: Record<string, string>,
): EmailResult;

export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTransport {
  send(email: EmailOptions): Promise<any>;
}

export interface EmailSender {
  send(options: EmailOptions): Promise<any>;
}

export function createEmailSender(transport: EmailTransport): EmailSender;

// --- Transports ---

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export function createSmtpTransport(config: SmtpConfig): EmailTransport;

export interface SendGridConfig {
  apiKey: string;
}

export interface SendGridResponse {
  ok: boolean;
  status: number;
}

export function createSendGridTransport(config: SendGridConfig): {
  send(email: EmailOptions): Promise<SendGridResponse>;
};

export interface ResendConfig {
  apiKey: string;
}

export interface ResendResponse {
  ok: boolean;
  status: number;
  id?: string;
}

export function createResendTransport(config: ResendConfig): {
  send(email: EmailOptions): Promise<ResendResponse>;
};

// --- In-App Notifications ---

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationInput {
  id?: string;
  type?: string;
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string;
}

export interface NotificationCenter {
  notify(notification: NotificationInput): Notification;
  getAll(): Notification[];
  getUnread(): Notification[];
  markRead(id: string): void;
  markAllRead(): void;
  remove(id: string): void;
  clear(): void;
  subscribe(callback: (notifications: Notification[]) => void): () => void;
}

export function createNotificationCenter(): NotificationCenter;
