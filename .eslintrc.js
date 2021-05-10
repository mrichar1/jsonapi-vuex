module.exports = {
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'plugin:prettier-vue/recommended'],
  env: {
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'prettier-vue/prettier': 'error',
    camelcase: 'error',
    'no-console': 'warn',
  },
}
