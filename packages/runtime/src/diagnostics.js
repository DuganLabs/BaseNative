function logDiagnostic(diagnostic) {
  const method = diagnostic.level === 'error' ? 'error' : 'warn';
  console[method]?.(`[BaseNative:${diagnostic.code}] ${diagnostic.message}`, diagnostic);
}

export function createRuntimeOptions(options = {}) {
  return {
    dev: options.dev === true,
    recover: options.recover ?? 'client',
    onDiagnostic: options.onDiagnostic,
    onMismatch: options.onMismatch,
  };
}

export function emitDiagnostic(options, diagnostic) {
  if (typeof options?.onDiagnostic === 'function') {
    options.onDiagnostic(diagnostic);
  } else if (options?.dev) {
    logDiagnostic(diagnostic);
  }
}

export function reportHydrationMismatch(options, message, detail = {}) {
  const diagnostic = {
    level: 'warn',
    domain: 'hydration',
    code: detail.code ?? 'BN_HYDRATE_MISMATCH',
    message,
    detail,
  };

  if (typeof options?.onMismatch === 'function') {
    options.onMismatch(diagnostic);
  }
  emitDiagnostic(options, diagnostic);

  if (options?.recover === 'throw') {
    throw new Error(`[${diagnostic.code}] ${diagnostic.message}`);
  }
}
