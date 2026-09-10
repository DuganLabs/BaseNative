import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.min.js',
      'examples/express/public/basenative.js',
      // esbuild's own bundled output, same as basenative.js above: it
      // escapes `</script>` in string literals as a safety measure for
      // bundles that might be inlined into HTML, which no-useless-escape
      // (correctly, for hand-written source) flags as unnecessary.
      'examples/express/public/builder.js',
      // Scaffolding templates, not workspace members: their eslint.config.js
      // imports @basenative/eslint-config, which cannot resolve from in-repo.
      'packages/cli/templates/',
    ],
  },
];
