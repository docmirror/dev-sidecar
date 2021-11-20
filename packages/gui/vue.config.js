const path = require('path')
const webpack = require('webpack')
const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
console.log('publish url', publishUrl)
module.exports = {
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'DevSidecar-给开发者的边车辅助工具'
    }
  },
  configureWebpack: (config) => {
    const configNew = {
      plugins: [
        new webpack.DefinePlugin({ 'global.GENTLY': true })
      ],
      module: {
        rules: [
          {
            test: /\.json5$/i,
            loader: 'json5-loader',
            options: {
              esModule: false
            },
            type: 'javascript/auto'
          }
        ]
      }
    }
    return configNew
  },
  pluginOptions: {
    electronBuilder: {
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
            to: 'extra'
          }
        ],
        appId: 'dev-sidecar',
        productName: 'dev-sidecar',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: 'DevSidecar-${version}.${ext}',
        copyright: 'Copyright © 2020-2021 Greper',
        nsis: {
          oneClick: false,
          perMachine: true,
          allowElevation: true,
          allowToChangeInstallationDirectory: true,
          include: './build/installer.nsh'
        },
        mac: {
          icon: './build/mac/icon.icns',
          target: {
            arch: 'universal',
            target: 'dmg'
          }
        },
        win: {
          icon: 'build/icons/'
          // requestedExecutionLevel: 'highestAvailable' // 加了这个无法开机自启
        },
        linux: {
          icon: 'build/mac/',
          target: [
            'deb',
            'AppImage'
          ]
        },
        publish: {
          provider: publishProvider,
          url: publishUrl
          // url: 'http://dev-sidecar.docmirror.cn/update/preview/'
        }
      },
      chainWebpackMainProcess (config) {
        config.entry('mitmproxy').add(path.join(__dirname, 'src/bridge/mitmproxy.js'))
      }
    }
  }
}
