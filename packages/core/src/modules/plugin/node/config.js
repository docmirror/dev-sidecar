module.exports = {
  name: 'NPM加速',
  enabled: false,
  startup: {
    variables: true
  },
  setting: {
    'strict-ssl': true,
    cafile: false,
    NODE_EXTRA_CA_CERTS: false,
    NODE_TLS_REJECT_UNAUTHORIZED: false,
    registry: 'https://registry.npmjs.org'// 可以选择切换官方或者淘宝镜像
  },
  intercepts: {
    'cdn.cypress.io': [{ regexp: '/desktop/.*', proxy: 'http://npm.taobao.org/mirrors/cypress/' }]
  },
  variables: {
    SASS_BINARY_SITE: 'https://npm.taobao.org/mirrors/node-sass/',
    PHANTOMJS_CDNURL: 'https://npm.taobao.org/mirrors/phantomjs/',
    ELECTRON_MIRROR: 'https://npm.taobao.org/mirrors/electron/',
    // CYPRESS_DOWNLOAD_MIRROR: 'https://cdn.cypress.io',
    NVM_NODEJS_ORG_MIRROR: 'https://npm.taobao.org/mirrors/node',
    CHROMEDRIVER_CDNURL: 'https://npm.taobao.org/mirrors/chromedriver',
    OPERADRIVER: 'https://npm.taobao.org/mirrors/operadriver',
    ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npm.taobao.org/mirrors/electron-builder-binaries/',
    PYTHON_MIRROR: 'https://npm.taobao.org/mirrors/python'
  }
}
