module.exports = {
  extends: ["plugin:prettier/recommended"],
  env: {
    browser: false,
    es6: true,
    mocha: true
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  }
};
