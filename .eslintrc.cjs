module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  overrides: [
    {
      files: ['**/*.test.js', 'test/**/*.js'],
      env: {
        // technically, we are using vitest, but that's pretty similar to jest
        jest: true,
      },
      settings: {
        'import/ignore': [
          // for some reason, `import {it} from "vitest";` throws an error
          /node_modules\/vitest\/dist\/index\.js$/.source,
        ],
      },
    },
  ],
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'import/no-cycle': 'error',
    // make sure that all files have an extension (required by ESM)
    'import/extensions': [
      'error',
      'always',
      {
        js: 'always',
        jsx: 'never',
        mjs: 'always',
      },
    ],
  },
};
