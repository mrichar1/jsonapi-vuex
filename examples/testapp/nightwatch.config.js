module.exports = {
  "selenium" : {
    "cli_args" : {
      "webdriver.chrome.driver": require("chromedriver").path
    }
  },
  "test_settings": {
  "FirefoxHeadless": {
    "desiredCapabilities": {
      "browserName": "firefox",
      "acceptInsecureCerts": true,
      "moz:firefoxOptions": {
        "args": ["--headless"]
      }
    }
  },
  "ChromeHeadless": {
    "desiredCapabilities": {
      "browserName": "chrome",
      "javascriptEnabled": true,
      "acceptSslCerts": true,
      "chromeOptions": {
        "args": ["headless"]
      }
    }
  }
  }
}
