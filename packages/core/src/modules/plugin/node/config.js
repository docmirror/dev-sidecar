module.exports = {
  name: 'NPM加速',
  enabled: false,
  tip: '如果你没有安装nodejs则不需要启动它',
  startup: {
    variables: true,
  },
  setting: {
    'command': 'npm',
    'strict-ssl': true,
    'cafile': false,
    'NODE_EXTRA_CA_CERTS': false,
    'NODE_TLS_REJECT_UNAUTHORIZED': false,
    'registry': 'https://registry.npmjs.org', // 可以选择切换官方或者淘宝镜像
    'registryList': {
      taobao: {
        name: 'taobao镜像',
        value: 'https://registry.npmmirror.com',
      },
      ustclug: {
        name: '中国科学技术大学镜像',
        value: 'https://npmreg.proxy.ustclug.org',
      },
    },
    'yarnRegistry': 'default',
    'yarnRegistryList': {
      taobao: {
        name: 'taobao镜像',
        value: 'https://registry.npmmirror.com',
      },
    },
  },
  // npm 11 开始不再接受未知的 npm config，以下镜像变量全部改为直接设置系统环境变量
  variables: {},
  envVariables: {
    ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
    ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
    PHANTOMJS_CDNURL: 'https://npmmirror.com/mirrors/phantomjs',
    CHROMEDRIVER_CDNURL: 'https://npmmirror.com/mirrors/chromedriver',
    SASS_BINARY_SITE: 'https://npmmirror.com/mirrors/node-sass',
    NVM_NODEJS_ORG_MIRROR: 'https://npmmirror.com/mirrors/node',
    OPERADRIVER: 'https://npmmirror.com/mirrors/operadriver',
    PYTHON_MIRROR: 'https://npmmirror.com/mirrors/python',
  },
}
