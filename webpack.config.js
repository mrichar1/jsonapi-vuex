module.exports = {
  mode: 'production',
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
