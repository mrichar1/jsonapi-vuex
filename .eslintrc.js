module.exports = {
  extends: ["plugin:prettier/recommended"],
  env: {
    browser: true,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  rules: {
    "prettier/prettier": [
      "error",
      {
        singleQuote: true
      }
    ],
    "no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "should|expect"
      }
    ]
  }
};
