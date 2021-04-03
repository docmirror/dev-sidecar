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
    }
  },
  server: {
    enabled: true,
    port: 1181,
    setting: {
      NODE_TLS_REJECT_UNAUTHORIZED: true,
      script: {
        enabled: true,
        defaultDir: '../../../scripts/'
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
            'jquery',
            'github'
          ],
          desc: 'clone加速复制链接脚本'
        },
        '/.*': {
          proxy: 'gh.docmirror.top/_proxy',
          backup: [
            'github.com'
          ]
        }
      },
      'api.github.com': {
        '^/_private/browser/stats$': {
          success: true,
          desc: 'github的访问速度分析上传，没有必要，直接返回成功'
        }
      },
      '/.*/.*/raw11/': {
        replace: '(.+)\\/raw\\/(.+)',
        proxy: 'raw.fastgit.org$1/$2'
      },
      'raw.11githubusercontent.com': {
        '.*': { proxy: 'raw.fastgit.org' }
      },
      // 'github.githubassets.com': {
      //   '.*': {
      //     proxy: 'assets-gh.docmirror.top/_proxy',
      //     test: 'https://github.githubassets.com/favicons/favicon.svg',
      //     desc: '静态资源加速'
      //   }
      // },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' }
      },
      // google cdn
      'www.google.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' }
      //   '.*': {
      //     proxy: 'gg.docmirror.top/_yxorp',
      //     desc: '呀，被你发现了，偷偷的用，别声张'
      //   }
      },
      'ajax.googleapis.com': {
        '.*': {
          proxy: 'ajax.loli.net',
          test: 'ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js'
        }
      },
      'fonts.googleapis.com': {
        '.*': {
          proxy: 'fonts.loli.net',
          backup: ['fonts.proxy.ustclug.org'],
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
      '*.s3.amazonaws.com': {
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
      'alipay.com': true,
      '*.alipay.com': true,
      'pay.weixin.qq.com': true,
      'www.baidu.com': true
    },
    dns: {
      providers: {
        aliyun: {
          type: 'https',
          server: 'https://dns.alidns.com/dns-query',
          cacheSize: 1000
        },
        // ipaddress: {
        //   type: 'ipaddress',
        //   server: 'ipaddress',
        //   cacheSize: 1000
        // },
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
        // google: {
        //   type: 'https',
        //   server: 'https://8.8.8.8/dns-query',
        //   cacheSize: 1000
        // },
        // dnsSB: {
        //   type: 'https',
        //   server: 'https://doh.dns.sb/dns-query',
        //   cacheSize: 1000
        // }
      },
      mapping: {
        // 'assets.fastgit.org': 'usa',
        '*githubusercontent.com': 'quad9',
        '*yarnpkg.com': 'usa',
        '*cloudfront.net': 'usa',
        '*github.io': 'usa',
        'img.shields.io': 'usa',
        '*.githubusercontent.com': 'usa',
        '*.githubassets.com': 'usa',
        // "解决push的时候需要输入密码的问题",
        'github.com': 'quad9',
        '*github.com': 'usa',
        '*.vuepress.vuejs.org': 'usa',
        'gh.docmirror.top': 'aliyun'
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
