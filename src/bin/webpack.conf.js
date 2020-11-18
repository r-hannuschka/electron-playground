//@ts-check
'use strict';

const path = require('path');
const TsConfigPathsPlugin =  require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const electonBaseConfiguration = {
    devtool: 'source-map',
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
        // @ts-ignore
        plugins: [new TsConfigPathsPlugin({
            configFile: path.resolve(process.cwd(), "./tsconfig.json")
        })]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(process.cwd(), "./tsconfig.json")
                        }
                    }
                ]
            }
        ]
    }
};

/**
 * webpack for electron main process, this is the file which
 * will started with electron
 */
const electronMainProcess = {
    ...electonBaseConfiguration,
    target: 'electron-main',
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "electron-[name].js"
    },
    node: {
        __dirname: false
    },
    entry: {
        "app": './app/electron/main.ts'
    },
    mode: "development"
};

/**
 * webpack for electron renderer process, this file would be included
 * into the index.html file
 */
const electronRendererProcess = {
    ...electonBaseConfiguration,
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "renderer-[name].js"
    },
    target: 'electron-renderer',
    entry: {
        "view": './app/view/main.ts'
    },
    mode: "development",
    plugins: [
        new HtmlWebpackPlugin({
            template: "./app/view/main.html"
        })
    ]
};

module.exports = [electronMainProcess, electronRendererProcess];
