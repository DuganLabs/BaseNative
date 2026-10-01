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

export interface AccountsResult {
  accounts: Array<{ id: string; name: string; type: string; subtype: string }>;
}

export interface CreateTransferParams {
  accessToken: string;
  /** Account to transfer from. */
  accountId: string;
  type: 'debit' | 'credit';
  /** Amount in cents. */
  amount: number;
  description?: string;
  /** `'rtp'` requests RTP/FedNow and falls back to ACH when Plaid rejects it. */
  network?: 'rtp' | 'ach';
  user?: { name: string; email: string };
}

export interface TransferResult {
  transferId: string;
  status: string;
  network: string;
}

export interface TransferStatusResult {
  transferId: string;
  status: string;
  amount: number;
  network: string;
}

/** The part of a signal that `createPlaidLink` writes to. */
export interface SettableSignal {
  set(value: string): void;
}

export interface CreatePlaidLinkConfig extends OpenPlaidLinkOptions {
  /** A signal factory such as `signal` from `@basenative/runtime`; when absent, `linkToken` and `linkStatus` are `null`. */
  signals?: { signal?: (initial: string) => SettableSignal };
}

export interface PlaidLinkSession extends PlaidLinkHandler {
  /** Holds the link token, when a signal factory was supplied. */
  linkToken: SettableSignal | null;
  /** Holds `'ready'`, then `'success'` or `'exit'`, when a signal factory was supplied. */
  linkStatus: SettableSignal | null;
}

// Client-side Link API
export function loadPlaidScript(): Promise<void>;
export function openPlaidLink(options: OpenPlaidLinkOptions): Promise<PlaidLinkHandler>;
export function createPlaidLink(config: CreatePlaidLinkConfig): Promise<PlaidLinkSession>;

// Server-side API
export interface PlaidClient {
  exchangePublicToken(publicToken: string): Promise<ExchangeResult>;
  getAccounts(accessToken: string): Promise<AccountsResult>;
  getBalance(accessToken: string): Promise<BalancesResult>;
  createTransfer(params: CreateTransferParams): Promise<TransferResult>;
  getTransferStatus(transferId: string): Promise<TransferStatusResult>;
}

export function createPlaidClient(config: { clientId: string; secret: string; environment?: 'sandbox' | 'development' | 'production' }): PlaidClient;
export function createLinkToken(options: LinkTokenOptions, credentials: PlaidCredentials): Promise<LinkTokenResult>;
export function exchangePublicToken(publicToken: string, credentials: PlaidCredentials): Promise<ExchangeResult>;
export function getAccounts(accessToken: string, credentials: PlaidCredentials): Promise<AccountsResult>;
export function getBalances(accessToken: string, credentials: PlaidCredentials): Promise<BalancesResult>;
export function getBalance(accessToken: string, credentials: PlaidCredentials): Promise<BalancesResult>;
export function createTransfer(params: CreateTransferParams, credentials: PlaidCredentials): Promise<TransferResult>;
export function getTransferStatus(transferId: string, credentials: PlaidCredentials): Promise<TransferStatusResult>;

// Yield optimization API
export interface YieldAccount {
  id: string;
  name: string;
  balance: number;
  apy: number;
  maxBalance?: number;
}

export interface BestYieldResult {
  accountId: string;
  accountName: string;
  apy: number;
  expectedMonthlyYield: number;
}

export interface FloatAllocation {
  accountId: string;
  accountName: string;
  allocation: number;
  expectedYield: number;
}

export interface TransferSchedule {
  transferDate: Date;
  fromAccountId: string;
  amount: number;
  reason: string;
}

export interface BreakEvenResult {
  profitable: boolean;
  yieldGain: number;
  breakEvenDays: number;
}

export function findBestYieldAccount(accounts: YieldAccount[]): BestYieldResult;
export function optimizeFloatAllocation(accounts: YieldAccount[], totalFloat: number): FloatAllocation[];
export function calculateOptimalTransferTiming(
  liabilities: Array<{ dueDate: Date; amount: number; description?: string }>,
  accounts: YieldAccount[]
): TransferSchedule[];
export function calculateBreakEven(
  amount: number,
  fromApy: number,
  toApy: number,
  transferCostCents?: number,
  daysFloat?: number
): BreakEvenResult;
