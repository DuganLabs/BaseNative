// Re-export the barrel so subpath imports type-check under
// moduleResolution: bundler (which follows the exports.types field
// per-subpath instead of falling back to the package root types).
export * from './index.js';
