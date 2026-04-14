const path = require('node:path')
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
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: './src/background.js',
      // Ref: https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/1891
      customFileProtocol: './',
      externals: [
        '@starknt/sysproxy',
        '@starknt/sysproxy-linux-arm64-gnu',
        '@starknt/shutdown-handler-napi',
        '@starknt/shutdown-handler-napi-linux-arm64-gnu',
      ],
      nodeIntegration: true,
      // Provide an array of files that, when changed, will recompile the main process and restart Electron
      // Your main process file will be added by default
      mainProcessWatch: ['src/bridge', 'src/*.js', 'node_modules/dev-sidecar/src'],
      builderOptions: {
        afterPack: './pkg/after-pack.js',
        afterAllArtifactBuild: './pkg/after-all-artifact-build.js',
        // artifactBuildCompleted: './pkg/artifact-build-completed.js',
        // builderOptions: {
        //   publish: ['github']// 此处写入github 就好，不用添加其他内容
        // },
        extraResources: [
          {
            from: 'extra',
            to: 'extra',
          },
        ],
        appId: 'cn.docmirror.DevSidecar',
        productName: 'dev-sidecar',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: 'DevSidecar-${version}-${arch}.${ext}',
        copyright: 'Copyright © 2020-2026 Greper, WangLiang, CuteOmega',
        nsis: {
          oneClick: false,
          perMachine: true,
          allowElevation: true,
          allowToChangeInstallationDirectory: true,
        },
        linux: {
          icon: 'build/mac/',
          target: [
            {
              target: 'flatpak',
              arch: ['arm64', 'armv7l'],
            },
          ],
          category: 'System',
        },
        publish: {
          provider: publishProvider,
          url: publishUrl,
          // url: 'http://dev-sidecar.docmirror.cn/update/preview/',
        },
      },
      chainWebpackMainProcess (config) {
        config.entry('mitmproxy').add(path.join(__dirname, 'src/bridge/mitmproxy.js'))
      },
    },
  },
})
