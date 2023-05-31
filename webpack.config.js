const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    sideEffects: false,
  },
  context: path.resolve(__dirname),
  // Exclude third party bundles
  externals: [
    function ({context, request}, callback) {
      if (/.*node_modules.*/.test(context) || !/[.].*/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    libraryTarget: 'commonjs',
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
