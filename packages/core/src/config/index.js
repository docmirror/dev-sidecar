const path = require('path')
function getUserBasePath () {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  return path.resolve(userHome, './.dev-sidecar')
}
function getRootCaCertPath () {
  return getUserBasePath() + '/dev-sidecar.ca.crt'
}
function getRootCaKeyPath () {
  return getUserBasePath() + '/dev-sidecar.ca.key.pem'
}
module.exports = {
  app: {
    mode: 'default',
    autoStart: {
      enabled: false
    },
    remoteConfig: {
      enabled: true,
      url: 'https://gitee.com/docmirror/dev-sidecar/raw/master/packages/core/src/config/remote_config.json5'
    },
    dock: {
      hideWhenWinClose: false
    },
    closeStrategy: 0,
    showShutdownTip: true
  },
  server: {
    enabled: true,
    host: '127.0.0.1',
    port: 31181,
    setting: {
      NODE_TLS_REJECT_UNAUTHORIZED: true,
      verifySsl: true,
      script: {
        enabled: true,
        defaultDir: './extra/scripts/'
      },
      userBasePath: getUserBasePath(),
      rootCaFile: {
        certPath: getRootCaCertPath(),
        keyPath: getRootCaKeyPath()
      }
    },
    intercept: {
      enabled: true
    },
    intercepts: {
      'github.com': {
        '/.*/.*/releases/download/': {
          redirect: 'download.fastgit.org',
          desc: 'release文件加速下载跳转地址'
        },
        '/.*/.*/archive/': {
          redirect: 'download.fastgit.org'
        },
        '/.*/.*/blame/': {
          redirect: 'hub.fastgit.org'
        },
        '^/[^/]+/[^/]+(/releases(/.*)?)?$': {
          script: [
            'github'
          ],
          desc: 'clone加速复制链接脚本'
        },
        '/.*': {
          proxy: 'github.com',
          // proxy: 'gh.docmirror.top/_proxy',
          desc: '目前禁掉sni就可以直接访问，如果后续github.com的ip被封锁，只能再走proxy模式',
          sni: 'baidu.com'
        }
        // '/.*/.*/raw11/': {
        //   replace: '(.+)\\/raw\\/(.+)',
        //   proxy: 'raw.fastgit.org$1/$2',
        //   sni: 'baidu.com'
        // }
      },
      'github-releases.githubusercontent.com': {
        '.*': {
          proxy: 'github-releases.githubusercontent.com',
          sni: 'baidu.com'
        }
      },
      'github.githubassets.com': {
        '.*': {
          proxy: 'github.githubassets.com',
          backup: [
            'assets.fastgit.org'
          ],
          sni: 'assets.fastgit.org'
        }
      },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' }
      },

      'raw.githubusercontent.com': {
        '.*': {
          proxy: 'raw.githubusercontent.com',
          sni: 'baidu.com'
        }
        // '.*': { proxy: 'raw.fastgit.org' }
      },
      'user-images.githubusercontent.com': {
        '.*': {
          proxy: 'user-images.githubusercontent.com',
          sni: 'baidu.com'
        }
      },
      'avatars.githubusercontent.com': {
        '.*': {
          proxy: 'avatars.githubusercontent.com',
          sni: 'baidu.com'
        }
      },
      'api.github.com': {
        '^/_private/browser/stats$': {
          success: true,
          desc: 'github的访问速度分析上传，没有必要，直接返回成功'
        }
      },
      // 'v2ex.com': {
      //   '.*': {
      //     proxy: 'v2ex.com',
      //     sni: 'baidu.com'
      //   }
      // },
      // google cdn
      'www.google.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' }
        // '.*': {
        //   proxy: 'gg.docmirror.top/_yxorp',
        //   desc: '呀，被你发现了，偷偷的用，别声张'
        // }
      },
      'ajax.googleapis.com': {
        '.*': {
          proxy: 'ajax.lug.ustc.edu.cn',
          backup: ['gapis.geekzu.org'],
          test: 'ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js'
        }
      },
      'fonts.googleapis.com': {
        '.*': {
          proxy: 'fonts.geekzu.org',
          backup: ['fonts.loli.net'],
          test: 'https://fonts.googleapis.com/css?family=Oswald'
        }
      },
      'themes.googleapis.com': {
        '.*': {
          proxy: 'themes.loli.net',
          backup: ['themes.proxy.ustclug.org']
        }
      },
      'themes.googleusercontent.com': {
        '.*': { proxy: 'google-themes.proxy.ustclug.org' }
      },
      // 'fonts.gstatic.com': {
      //   '.*': {
      //     proxy: 'gstatic.loli.net',
      //     backup: ['fonts-gstatic.proxy.ustclug.org']
      //   }
      // },
      'clients*.google.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      'www.googleapis.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      'lh*.googleusercontent.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      // mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.0/napi-v3-win32-x64.tar.gz
      '*.s3.1amazonaws1.com': {
        '/sqlite3/.*': {
          redirect: 'npm.taobao.org/mirrors'
        }
      },
      // 'packages.elastic.co': { '.*': { proxy: 'elastic.proxy.ustclug.org' } },
      // 'ppa.launchpad.net': { '.*': { proxy: 'launchpad.proxy.ustclug.org' } },
      // 'archive.cloudera.com': { '.*': { regexp: '/cdh5/.*', proxy: 'cloudera.proxy.ustclug.org' } },
      // 'downloads.lede-project.org': { '.*': { proxy: 'lede.proxy.ustclug.org' } },
      // 'downloads.openwrt.org': { '.*': { proxy: 'openwrt.proxy.ustclug.org' } },
      // 'secure.gravatar.com': { '.*': { proxy: 'gravatar.proxy.ustclug.org' } },
      '*.carbonads.com': {
        '/carbon.*': {
          abort: true,
          desc: '广告拦截'
        }
      },
      '*.buysellads.com': {
        '/ads/.*': {
          abort: true,
          desc: '广告拦截'
        }
      }
    },
    whiteList: {
      'apple.com': true,
      '*.apple.com': true,
      'microsoft.com': true,
      '*.microsoft.com': true,
      'alipay.com': true,
      '*.alipay.com': true,
      'pay.weixin.qq.com': true,
      'www.baidu.com': true
    },
    // sniList: {
    //   'github.com': 'abaidu.com'
    // },
    dns: {
      providers: {
        aliyun: {
          type: 'https',
          server: 'https://dns.alidns.com/dns-query',
          cacheSize: 1000
        },
        usa: {
          type: 'https',
          server: 'https://1.1.1.1/dns-query',
          cacheSize: 1000
        },
        quad9: {
          type: 'https',
          server: 'https://9.9.9.9/dns-query',
          cacheSize: 1000
        },
        rubyfish: {
          type: 'https',
          server: 'https://rubyfish.cn/dns-query',
          cacheSize: 1000
        }
      },
      mapping: {
        // 'assets.fastgit.org': 'usa',
        '*.electronjs.org': 'quad9',
        '*amazonaws.com': 'quad9',
        '*githubusercontent.com': 'quad9',
        '*yarnpkg.com': 'quad9',
        '*cloudfront.net': 'quad9',
        '*cloudflare.com': 'quad9',
        '*github.io': 'quad9',
        'img.shields.io': 'quad9',
        '*.githubusercontent.com': 'quad9',
        '*.githubassets.com': 'quad9',
        // "解决push的时候需要输入密码的问题",
        'github.com': 'quad9',
        '*github.com': 'quad9',
        '*.vuepress.vuejs.org': 'quad9',
        'gh.docmirror.top': 'quad9',
        '*v2ex.com': 'quad9',
        '*pypi.org': 'quad9',
        '*jetbrains.com': 'quad9',
        '*azureedge.net': 'quad9'
      },
      speedTest: {
        enabled: true,
        interval: 60000,
        hostnameList: ['github.com'],
        dnsProviders: ['usa', 'quad9', 'rubyfish']
      }
    }
  },
  proxy: {},
  plugin: {}
}
