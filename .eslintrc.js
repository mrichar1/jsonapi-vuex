module.exports = {
  "env": {
   "browser": true,
    "es6": true,
    "mocha": true
  },
  "parserOptions": {
    "ecmaVersion": 2018,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": [
      "error",
      {
        "varsIgnorePattern": "should|expect"
      }
    ],
    "object-curly-spacing": [
      "error",
      "always",
      {
        "objectsInObjects": false
      }
    ],
    "array-bracket-spacing": [
      "error",
      "always",
      {
        "singleValue": true,
        "arraysInArrays": false
      }
    ]
  }
}
