module.exports = {
  server: {
    enabled: true,
    port: 1181,
    setting: {
      NODE_TLS_REJECT_UNAUTHORIZED: true
    },
    intercepts: {
      'github.com': {
        '/.*/.*/releases/download/': {
          redirect: 'download.fastgit.org'
        },
        '/.*/.*/archive/': {
          redirect: 'download.fastgit.org'
        },
        '/.*/.*/raw/': {
          redirect: 'hub.fastgit.org'
        },
        '/.*/.*/blame/': {
          redirect: 'hub.fastgit.org'
        }
      },
      'raw.githubusercontent.com': {
        '.*': { proxy: 'raw.fastgit.org' }
      },
      'github.githubassets.com': {
        '.*': { proxy: 'assets.fastgit.org' }
      },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' }
      },

      // google cdn
      'ajax.googleapis.com': {
        '.*': {
          proxy: 'ajax.loli.net',
          backup: ['ajax.proxy.ustclug.org'],
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
      'www.google.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' }
      },
      'fonts.gstatic.com': {
        '.*': {
          proxy: 'fonts-gstatic.proxy.ustclug.org',
          backup: ['gstatic.loli.net']
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
      'secure.gravatar.com': { '.*': { proxy: 'gravatar.proxy.ustclug.org' } }
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
    }
  },
  proxy: {},
  plugin: {}
}
