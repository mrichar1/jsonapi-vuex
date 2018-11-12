module.exports = {
  mode: 'production',
  performance: { 'hints': false },
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: "eslint-loader",
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
	use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              ['istanbul', {
              "exclude": [
                "**/*.spec.js"
              ]
              }],
	    ],
          }
        }
      }
    ]
  }
}
