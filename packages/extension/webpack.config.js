// @ts-check
const path = require('path');

/** @type {import('webpack').Configuration[]} */
module.exports = [
  // Extension host bundle
  {
    name: 'extension',
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    externals: { vscode: 'commonjs vscode' },
    resolve: { extensions: ['.ts', '.js'] },
    // Suppress the "critical dependency" warning from dynamic import() in @nodewave/core
    ignoreWarnings: [/Critical dependency/],
    module: {
      rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
    devtool: 'nosources-source-map',
  },
  // WebView UI bundle (React)
  {
    name: 'webviews',
    target: 'web',
    mode: 'production',
    entry: {
      wizard: './src/webviews/wizard/index.tsx',
      settings: './src/webviews/settings/index.tsx',
      upgrade: './src/webviews/upgrade/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist/webviews'),
      filename: '[name].js',
    },
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    module: {
      rules: [
        { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
  },
];
