module.exports = {
  mode: 'production',
  performance: { hints: false },
  // Re-enable Errors (disabled in production mode) to allow eslint to stop build
  optimization: {
    noEmitOnErrors: true,
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'eslint-loader',
        options: {
          failOnWarning: false,
          failOnError: true,
        },
      },
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
