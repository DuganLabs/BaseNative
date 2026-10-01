// Built with BaseNative — basenative.dev

export interface ClientPaths {
  registerOptions?: string;
  registerVerify?: string;
  loginOptions?: string;
  loginVerify?: string;
  me?: string;
  logout?: string;
}
export interface ClientOpts {
  paths?: ClientPaths;
  fetchInit?: RequestInit;
}
export function isPasskeySupported(): boolean;
export function isPlatformPasskeySupported(): Promise<boolean>;
export function registerPasskey(handle: string, opts?: ClientOpts): Promise<unknown>;
export function loginPasskey(handle: string, opts?: ClientOpts): Promise<unknown>;
export function me(opts?: ClientOpts): Promise<unknown>;
export function logout(opts?: ClientOpts): Promise<unknown>;
