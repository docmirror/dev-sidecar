const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
console.log('Publish url:', publishUrl)

module.exports = defineConfig({
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'DevSidecar-给开发者的边车辅助工具',
    },
  },
  lintOnSave: false,
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({ 'global.GENTLY': true }),
    ],
    module: {
      rules: [
        {
          test: /\.json5$/i,
          loader: 'json5-loader',
          options: {
            esModule: false,
          },
          type: 'javascript/auto',
        },
      ],
    },
  },
})
