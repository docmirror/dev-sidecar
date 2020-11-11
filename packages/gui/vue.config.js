const path = require('path')
module.exports = {
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'DevSidecar-给开发者的边车辅助工具'
    }
  },
  configureWebpack: config => {
    const configNew = {
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
        extraResources: [
          {
            from: 'extra',
            to: 'extra'
          }
        ],
        appId: 'dev-sidecar',
        productName: 'DevSidecar',
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: 'DevSidecar-${version}.${ext}',
        copyright: 'Copyright © 2020',
        nsis: {
          oneClick: false,
          perMachine: false,
          allowElevation: true,
          allowToChangeInstallationDirectory: true
        },
        publish: {
          provider: 'generic',
          url: ''
        },
        compression: 'maximum'
      },
      chainWebpackMainProcess (config) {
        config.entry('mitmproxy').add(path.join(__dirname, 'src/bridge/mitmproxy.js'))
      }
    }
  }
}
