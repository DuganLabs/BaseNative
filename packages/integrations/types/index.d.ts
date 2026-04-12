// Plaid integration types

export interface PlaidCredentials {
  clientId: string;
  secret: string;
  env?: 'sandbox' | 'development' | 'production';
}

export interface LinkTokenOptions {
  userId: string;
  clientName?: string;
  products?: string[];
  countryCodes?: string[];
  language?: string;
}

export interface LinkTokenResult {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export interface ExchangeResult {
  accessToken: string;
  itemId: string;
  requestId: string;
}

export interface PlaidBalance {
  available: number | null;
  current: number | null;
  limit: number | null;
  currency: string | null;
}

export interface PlaidAccount {
  id: string;
  name: string;
  type: string;
  subtype: string;
  balances: PlaidBalance;
}

export interface BalancesResult {
  accounts: PlaidAccount[];
}

export interface PlaidLinkHandler {
  open: () => void;
  destroy: () => void;
}

export interface OpenPlaidLinkOptions {
  token: string;
  onSuccess: (publicToken: string, metadata: unknown) => void;
  onExit?: (err: unknown, metadata: unknown) => void;
  onEvent?: (eventName: string, metadata: unknown) => void;
}

export function loadPlaidScript(): Promise<void>;
export function openPlaidLink(options: OpenPlaidLinkOptions): Promise<PlaidLinkHandler>;
export function createLinkToken(options: LinkTokenOptions, credentials: PlaidCredentials): Promise<LinkTokenResult>;
export function exchangePublicToken(publicToken: string, credentials: PlaidCredentials): Promise<ExchangeResult>;
export function getBalances(accessToken: string, credentials: PlaidCredentials): Promise<BalancesResult>;
