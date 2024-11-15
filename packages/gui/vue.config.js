const path = require('path')
const webpack = require('webpack')

const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
console.log('Publish url:', publishUrl)

/**
 * @type {import('@vue/cli-service').ProjectOptions}
 */
module.exports = {
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
      externals: [
        '@mihomo-party/sysproxy',
        '@mihomo-party/sysproxy-win32-ia32-msvc',
        '@mihomo-party/sysproxy-win32-x64-msvc',
        '@mihomo-party/sysproxy-win32-arm64-msvc',
        '@mihomo-party/sysproxy-linux-x64-gnu',
        '@mihomo-party/sysproxy-linux-arm64-gnu',
        '@mihomo-party/sysproxy-darwin-x64',
        '@mihomo-party/sysproxy-darwin-arm64',
        '@natmri/platform-napi',
        '@natmri/platform-napi-win32-ia32-msvc',
        '@natmri/platform-napi-win32-x64-msvc',
        '@natmri/platform-napi-win32-arm64-msvc',
        '@natmri/platform-napi-linux-x64-gnu',
        '@natmri/platform-napi-linux-x64-musl',
        '@natmri/platform-napi-linux-arm64-gnu',
        '@natmri/platform-napi-linux-arm64-musl',
        '@natmri/platform-napi-linux-arm-gnueabihf',
        '@natmri/platform-napi-darwin-x64',
        '@natmri/platform-napi-darwin-arm64',
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
        appId: 'dev-sidecar',
        productName: 'dev-sidecar',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: 'DevSidecar-${version}.${ext}',
        copyright: 'Copyright © 2020-2024 Greper, WangLiang',
        nsis: {
          oneClick: false,
          perMachine: true,
          allowElevation: true,
          allowToChangeInstallationDirectory: true,
          include: './build/installer.nsh',
        },
        mac: {
          icon: './build/mac/icon.icns',
          target: {
            arch: 'universal',
            target: 'dmg',
          },
        },
        win: {
          icon: 'build/icons/',
          // requestedExecutionLevel: 'highestAvailable' // 加了这个无法开机自启
        },
        linux: {
          icon: 'build/mac/',
          target: [
            'deb',
            'AppImage',
          ],
        },
        publish: {
          provider: publishProvider,
          url: publishUrl,
          // url: 'http://dev-sidecar.docmirror.cn/update/preview/'
        },
      },
      chainWebpackMainProcess (config) {
        config.entry('mitmproxy').add(path.join(__dirname, 'src/bridge/mitmproxy.js'))
      },
    },
  },
}
