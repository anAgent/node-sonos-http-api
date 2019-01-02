const path = require('path');

const config = {
  mode: 'development', // "production" | "development" | "none"
  entry: {
    // removing 'src' directory from entry point, since 'context' is taking care of that
    server: './src/server.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: './dist/[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};

module.exports = config;
