const path = require('path');

module.exports = {
  configureWebpack: {
    // Disable performance/asset size warnings due to using non-minified etc modules
    performance: { hints: false },
    context: path.resolve(__dirname + '/examples/testapp'),
  },
};
