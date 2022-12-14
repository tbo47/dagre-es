module.exports = {
  env: {
    browser: true,
    es6: true, // todo, increase this es2016 or later to use new Javascript features
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended'],
  overrides: [],
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
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
