// Karma configuration

const src = './src/**/*.js'
const tests = './spec/**/*.spec.js'

module.exports = function(config) {
  config.set({
    //singleRun: true,
    browsers: ['FirefoxHeadless'],
    customLaunchers: {
      'FirefoxHeadless': {
        base: 'Firefox',
        flags: [
          '-headless',
        ],
      }
    },
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      tests
    ],
    preprocessors: {
      [src]: ['webpack'],
      [tests]: ['webpack'],
    },
    webpack: require('./webpack.config'),
    reporters: ['verbose', 'coverage'],
    coverageReporter: {
      dir: 'coverage',
      reporters: [
        { type: 'text' },
        { type: 'text-summary' },
        //{ type: 'html' }
      ]
    }
  })
}
