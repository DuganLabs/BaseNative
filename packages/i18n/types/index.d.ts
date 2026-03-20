export interface I18nOptions {
  defaultLocale?: string;
  messages?: Record<string, Record<string, string>>;
}

export interface I18nInstance {
  locale: string;
  getLocale(): string;
  setLocale(locale: string): void;
  onLocaleChange(fn: (locale: string) => void): () => void;
  addMessages(locale: string, messages: Record<string, string>): void;
  t(key: string, params?: Record<string, string | number>): string;
  n(value: number, options?: Intl.NumberFormatOptions): string;
  d(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string;
}

export function createI18n(options?: I18nOptions): I18nInstance;

export interface I18nMiddlewareOptions {
  queryParam?: string;
  cookie?: string;
  supportedLocales?: string[];
}

export interface I18nContext {
  i18n: I18nInstance;
  t: I18nInstance['t'];
}

export function i18nMiddleware(
  i18n: I18nInstance,
  options?: I18nMiddlewareOptions
): (ctx: Record<string, unknown>, next?: () => void | Promise<void>) => void | Promise<void>;

export interface LoaderOptions {
  directory: string;
  i18n?: I18nInstance;
}

export interface Loader {
  load(locale: string): Promise<Record<string, string>>;
  loadAll(): Promise<Record<string, Record<string, string>>>;
}

export function createLoader(options: LoaderOptions): Loader;
export function loadMessages(locale: string, dirPath: string): Promise<Record<string, string>>;
