const ESLintPlugin = require('eslint-webpack-plugin');

const options = {
  extensions: [`js`, `jsx`],
  exclude: [
    'node_modules',
  ],
  failOnWarning: false,
  failOnError: true,
}
module.exports = {
  mode: 'production',
  performance: { hints: false },
  plugins: [new ESLintPlugin(options)],
  // Re-enable Errors (disabled in production mode) to allow eslint to stop build
  optimization: {
    emitOnErrors: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              [
                'istanbul',
                {
                  exclude: ['tests'],
                },
              ],
            ],
          },
        },
      },
    ],
  },
}
