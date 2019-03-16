// Karma configuration

const src = "./src/**/*.js";
const tests = "./tests/unit/jsonapi-vuex.spec.js";
const ci = process.env.CI || process.env.TRAVIS || false;

module.exports = function(config) {
  config.set({
    singleRun: ci,
    browsers: ["FirefoxHeadless"],
    customLaunchers: {
      FirefoxHeadless: {
        base: "Firefox",
        flags: ["-headless"]
      }
    },
    frameworks: ["mocha", "chai", "sinon"],
    files: ["node_modules/babel-polyfill/dist/polyfill.js", tests],
    preprocessors: {
      [src]: ["webpack"],
      [tests]: ["webpack"]
    },
    webpack: require("./webpack.config"),
    reporters: ["verbose", "coverage"],
    coverageReporter: {
      dir: "coverage",
      reporters: [
        { type: "text" },
        { type: "text-summary" }
        //{ type: 'html' }
      ]
    }
  });
};
