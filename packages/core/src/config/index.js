const path = require('path')
function getUserBasePath () {
  const userHome = process.env.USERPROFILE
  return path.resolve(userHome, './.dev-sidecar')
}
function getRootCaCertPath () {
  return getUserBasePath() + '/dev-sidecar.ca.crt'
}
function getRootCaKeyPath () {
  return getUserBasePath() + '/dev-sidecar.ca.key.pem'
}
module.exports = {
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
    intercepts: {
      'github.com': {
        '/.*/.*/releases/download/': {
          redirect: 'download.fastgit.org',
          desc: 'release文件加速下载跳转地址'
        },
        '/.*/.*/archive/': {
          redirect: 'download.fastgit.org'
        },
        '/.*/.*/raw/': {
          replace: '(.+)\\/raw\\/(.+)',
          proxy: 'raw.fastgit.org$1/$2'
        },
        '/.*/.*/blame/': {
          redirect: 'hub.fastgit.org'
        },
        '^/[^/]+/[^/]+$': {
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
          ],
          desc: '如果出现dev-sidecar报错，可能是加速地址dns被污染了，需要将本条配置删除'
        }
      },
      'api.github.com': {
        '^/_private/browser/stats$': {
          success: true,
          desc: 'github的访问速度分析上传，没有必要，直接返回成功'
        }
      },
      'raw.githubusercontent.com': {
        '.*': { proxy: 'raw.fastgit.org' }
      },
      'github.githubassets.com': {
        '.*': {
          proxy: 'assets.fastgit.org',
          backup: ['github.githubassets.com'],
          test: 'https://github.githubassets.com/favicons/favicon.svg',
          desc: '静态资源加速'
        }
      },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' }
      },
      // google cdn
      'www.google.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' },
        '.*': {
          proxy: 'gg.docmirror.top/_yxorp',
          desc: '呀，被你发现了，偷偷的用，别声张'
        }
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
      'fonts.gstatic.com': {
        '.*': {
          proxy: 'gstatic.loli.net',
          backup: ['fonts-gstatic.proxy.ustclug.org']
        }
      },
      'clients*.google.com': { '.*': { abort: true } },
      'www.googleapis.com': { '.*': { abort: true } },
      'lh*.googleusercontent.com': { '.*': { abort: true } },
      // mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.0/napi-v3-win32-x64.tar.gz
      '*.s3.amazonaws.com': {
        '/sqlite3/.*': {
          redirect: 'npm.taobao.org/mirrors'
        }
      },
      'registry-1.docker.io': { '.*': { proxy: 'docker.mirrors.ustc.edu.cn' } },
      'packages.elastic.co': { '.*': { proxy: 'elastic.proxy.ustclug.org' } },
      'ppa.launchpad.net': { '.*': { proxy: 'launchpad.proxy.ustclug.org' } },
      'archive.cloudera.com': { '.*': { regexp: '/cdh5/.*', proxy: 'cloudera.proxy.ustclug.org' } },
      'downloads.lede-project.org': { '.*': { proxy: 'lede.proxy.ustclug.org' } },
      'downloads.openwrt.org': { '.*': { proxy: 'openwrt.proxy.ustclug.org' } },
      'secure.gravatar.com': { '.*': { proxy: 'gravatar.proxy.ustclug.org' } },
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
        usa: {
          type: 'https',
          server: 'https://cloudflare-dns.com/dns-query',
          cacheSize: 1000
        }
      },
      mapping: {
        '*github.io': 'usa',
        'img.shields.io': 'usa',
        '*.github.com': 'usa',
        '*.githubusercontent.com': 'usa',
        '*.githubassets.com': 'usa',
        // "解决push的时候需要输入密码的问题",
        'github.com': 'usa',
        '*.vuepress.vuejs.org': 'usa',
        'github.docmirror.cn': 'usa',
        'gh.docmirror.top': 'usa'
      }
    }
  },
  proxy: {},
  plugin: {}
}
