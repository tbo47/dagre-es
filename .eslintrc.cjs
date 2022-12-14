module.exports = {
  env: {
    browser: true,
    es6: true, // todo, increase this es2016 or later to use new Javascript features
    node: true,
  },
  extends: 'eslint:recommended',
  overrides: [],
  parserOptions: {
    sourceType: 'module',
  },
  rules: {},
};
