module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  extends: ['eslint:recommended', 'google'],
  rules: {
    quotes: 'off',
    'comma-dangle': 'off',
    indent: 'off',
    'object-curly-spacing': 'off',
    'operator-linebreak': 'off',
    'eol-last': 'off',
    'max-len': 'off',
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['lib/**/*', 'node_modules/**/*'],
};