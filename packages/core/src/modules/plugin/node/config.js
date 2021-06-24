module.exports = {
  name: 'NPM加速',
  enabled: false,
  tip: '如果你没有安装nodejs则不需要启动它',
  startup: {
    variables: true
  },
  setting: {
    'strict-ssl': true,
    cafile: false,
    NODE_EXTRA_CA_CERTS: false,
    NODE_TLS_REJECT_UNAUTHORIZED: false,
    yarnRegistry: undefined,
    registry: 'https://registry.npmjs.org'// 可以选择切换官方或者淘宝镜像
  },
  // intercepts: {
  //   'cdn.cypress.io': [{ regexp: '/desktop/.*', proxy: 'http://npm.taobao.org/mirrors/cypress/' }]
  // },
  variables: {
    phantomjs_cdnurl: 'https://npm.taobao.org/dist/phantomjs',
    chromedriver_cdnurl: 'https://npm.taobao.org/mirrors/chromedriver',
    sass_binary_site: 'https://npm.taobao.org/mirrors/node-sass',
    ELECTRON_MIRROR: 'https://npm.taobao.org/mirrors/electron/',
    // CYPRESS_DOWNLOAD_MIRROR: 'https://cdn.cypress.io',
    NVM_NODEJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/node',
    CHROMEDRIVER_CDNURL: 'https://npm.taobao.org/mirrors/chromedriver',
    OPERADRIVER: 'https://npm.taobao.org/mirrors/operadriver',
    ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npm.taobao.org/mirrors/electron-builder-binaries/',
    PYTHON_MIRROR: 'https://npm.taobao.org/mirrors/python'
  }
}
