module.exports = {
  extends: ['plugin:prettier/recommended', 'plugin:vue/recommended'],
  env: {
    browser: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error',
  },
}
