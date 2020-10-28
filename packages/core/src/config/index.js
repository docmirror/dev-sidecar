module.exports = {
  server: {
    port: 1181
  },
  intercepts: {
    'github.com': [
      {
        // "release archive 下载链接替换",
        regexp: [
          '/.*/.*/releases/download/',
          '/.*/.*/archive/'
        ],
        redirect: 'https://download.fastgit.org'
      },
      {
        regexp: [
          '/.*/.*/raw/',
          '/.*/.*/blame/'
        ],
        redirect: 'https://hub.fastgit.org'
      }
    ],
    // 'codeload.github.com': [
    //     {
    //         regexp: '.*',
    //         redirect:"https://download.fastgit.org"
    //     }
    // ],
    'raw.githubusercontent.com': [
      {
        proxy: 'https://raw.fastgit.org'
      }
    ],
    'github.githubassets.com': [
      {
        proxy: 'https://assets.fastgit.org'
      }
    ],
    'customer-stories-feed.github.com': [
      {
        proxy: 'https://customer-stories-feed.fastgit.org'
      }
    ],
    // google cdn
    // https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
    'ajax.googleapis.com': [
      {
        proxy: 'https://ajax.proxy.ustclug.org'
      }
    ],
    'fonts.googleapis.com': [
      {
        proxy: 'https://fonts.proxy.ustclug.org'
      }
    ],
    'themes.googleapis.com': [
      {
        proxy: 'https://themes.loli.net'
      }
    ],
    'fonts.gstatic.com': [
      {
        proxy: 'https://fonts-gstatic.proxy.ustclug.org'
      }
    ],
    'www.google.com': [
      {
        regexp: '/recaptcha/.*',
        proxy: 'https://www.recaptcha.net'
      }
    ],
    'clients*.google.com': [{ abort: true }],
    'www.googleapis.com': [{ abort: true }],
    'lh*.googleusercontent.com': [{ abort: true }],
    // https://mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.0/napi-v3-win32-x64.tar.gz
    '*.s3.amazonaws.com': [
      {
        regexp: '/sqlite3/.*',
        redirect: 'http://npm.taobao.org/mirrors'
      }
    ],
    'registry-1.docker.io': [{ proxy: 'docker.mirrors.ustc.edu.cn' }],
    'packages.elastic.co': [{ proxy: 'elastic.proxy.ustclug.org' }],
    'ppa.launchpad.net': [{ proxy: 'launchpad.proxy.ustclug.org' }],
    'archive.cloudera.com': [{ regexp: '/cdh5/.*', proxy: 'cloudera.proxy.ustclug.org' }],
    'downloads.lede-project.org': [{ proxy: 'lede.proxy.ustclug.org' }],
    'downloads.openwrt.org': [{ proxy: 'openwrt.proxy.ustclug.org' }],
    'themes.googleusercontent.com': [{ proxy: 'google-themes.proxy.ustclug.org' }],
    'secure.gravatar.com': [{ proxy: 'gravatar.proxy.ustclug.org' }]
  },
  dns: {
    providers: {
      aliyun: {
        type: 'https',
        server: 'https://dns.alidns.com/dns-query',
        cacheSize: 1000
      },
      usa: {
        type: 'https',
        server: 'https://cloudflare-dns.com/dns-query',
        cacheSize: 1000
      }
    },
    mapping: {
      // "解决push的时候需要输入密码的问题",
      'api.github.com': 'usa',
      'gist.github.com': 'usa'
      // "avatars*.githubusercontent.com": "usa"
    }
  },
  variables: {
    npm: {
      SASS_BINARY_SITE: 'https://npm.taobao.org/mirrors/node-sass/',
      PHANTOMJS_CDNURL: 'https://npm.taobao.org/mirrors/phantomjs/',
      ELECTRON_MIRROR: 'https://npm.taobao.org/mirrors/electron/',
      CYPRESS_DOWNLOAD_MIRROR: 'https://cdn.cypress.io',
      NVM_NODEJS_ORG_MIRROR: 'http://npm.taobao.org/mirrors/node',
      CHROMEDRIVER_CDNURL: 'http://npm.taobao.org/mirrors/chromedriver',
      OPERADRIVER: 'http://npm.taobao.org/mirrors/operadriver',
      ELECTRON_BUILDER_BINARIES_MIRROR: 'http://npm.taobao.org/mirrors/electron-builder-binaries/',
      PYTHON_MIRROR: 'http://npm.taobao.org/mirrors/python'
    }
  },
  setting: {
    startup: { // 开机启动
      server: true,
      proxy: {
        system: true,
        npm: true,
        yarn: true
      },
      variables: {
        npm: true
      }
    }
  }
}
