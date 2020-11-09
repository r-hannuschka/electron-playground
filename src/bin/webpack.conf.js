//@ts-check
'use strict';

const path = require('path');
const TsConfigPathsPlugin =  require('tsconfig-paths-webpack-plugin');

const config = {
    target: 'electron-main',
    node: {
        __dirname: false
    },
    entry: {
        "app": './app/main.ts'
    },
    mode: "development",
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]',
        chunkFilename: "[name].chunk.js"
    },
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

module.exports = config;
