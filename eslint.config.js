import js from '@eslint/js';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';

export default [
  {
    ignores: ['dist/'],
  },
  js.configs.recommended,
  importX.flatConfigs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-cycle': 'error',
      // make sure that all files have an extension (required by ESM)
      // `ignorePackages` exempts package subpaths such as `es-toolkit/compat`
      'import-x/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'always',
          jsx: 'never',
          mjs: 'always',
        },
      ],
    },
  },
  {
    files: ['**/*.test.js', 'test/**/*.js'],
    languageOptions: {
      // vite.config.js enables vitest `globals`, so `describe`, `it`, `expect`... are available
      globals: globals.vitest,
    },
  },
];
