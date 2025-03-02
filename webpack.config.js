const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = [
  {
    entry: './src/electron/main.ts',
    mode: 'development',
    target: 'electron-main',
    output: {
      path: path.resolve(__dirname, 'build/main'),
      filename: 'bundle.js',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      fallback: {
        "global": false
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'build/main'),
      },
      port: 3000,
      hot: true,
    },
  },
  {
    entry: './src/index.tsx',
    mode: 'development',
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'build/renderer'),
      filename: 'bundle.js',
      globalObject: 'this',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      fallback: {
        "global": false
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      new webpack.DefinePlugin({
        'global': 'window'
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'build/renderer'),
      },
      port: 3000,
      hot: true,
    },
  },
  {
    entry: './src/electron/preload.ts',
    target: 'electron-preload',
    output: {
      path: path.resolve(__dirname, 'build/main'),
      filename: 'preload.js'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  },
]; 
