/**
 * Copyright 2018 SME Texaplex Virtual Chapter Contributors. All Rights Reserved.
 * Copyright 2018 SME Virtual Network Contributors. All Rights Reserved.
 * Licensed under The MIT License.
 * =============================================================================
 */

import autoprefixer from "autoprefixer";
import path from "path";
import log from "fancy-log";
import ManifestPlugin from "webpack-manifest-plugin";
import UglifyJsPlugin from "uglifyjs-webpack-plugin";
import webpack from "webpack";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

log.warn("[Webpack] build mode: ", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");

const minimizerSettings = [];

if (IS_PRODUCTION) {
  minimizerSettings.push(
    new UglifyJsPlugin({
      cache: true,
      parallel: true,
      uglifyOptions: {
        compress: false,
        ecma: 6,
        mangle: true
      },
      sourceMap: true
    })
  );
}

export default {
  mode: IS_PRODUCTION ? "production" : "development",

  entry: {
    main: ["./frontend/scripts/index.ts"]
  },

  devtool: IS_PRODUCTION ? "source-map" : "inline-source-map",

  externals: {},

  output: {
    filename: IS_PRODUCTION ? "[name].min.[hash].js" : "[name].js",
    sourceMapFilename: IS_PRODUCTION ? "[name].min.[hash].map" : "[name].map",
    libraryTarget: "umd",
    path: path.resolve(__dirname, "dist")
  },

  resolve: {
    extensions: [".ts", ".js", ".scss"]
  },

  optimization: {
    minimizer: minimizerSettings
  },

  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              minimize: true
            }
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: () => [
                autoprefixer({
                  browsers: ["> 1%", "ie >= 11", "last 2 versions"]
                })
              ]
            }
          },
          "sass-loader?sourceMap"
        ]
      },
      {
        test: /(\.js$|\.ts(x?)$)/,
        exclude: /node_modules/,
        loader: "ts-loader"
      }
    ]
  },

  plugins: [
    new ManifestPlugin({
      fileName: "../data/staticfiles.json"
    }),
    new webpack.NamedChunksPlugin(chunk => {
      if (chunk.name) {
        return chunk.name;
      }
      return chunk.mapModules(m => path.relative(m.context, m.request)).join("_");
    })
  ]
};
