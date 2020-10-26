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
    'ajax.googleapis.com': [
      {
        proxy: 'https://ajax.loli.net'
      }
    ],
    'fonts.googleapis.com': [
      {
        proxy: 'https://fonts.loli.net'
      }
    ],
    'themes.googleapis.com': [
      {
        proxy: 'https://themes.loli.net'
      }
    ],
    'fonts.gstatic.com': [
      {
        proxy: 'https://gstatic.loli.net'
      }
    ],
    'www.google.com': [
      {
        regexp: '/recaptcha/.*',
        proxy: 'https://www.recaptcha.net'
      }
    ],
    'secure.gravatar.com': [
      {
        redirect: 'https://gravatar.loli.net'
      }
    ],
    'clients*.google.com': [
      {
        abort: true
      }
    ],
    'lh*.googleusercontent.com': [
      {
        abort: true
      }
    ]
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
  setting: {
    startup: { // 开机启动
      server: true,
      proxy: {
        system: true,
        npm: true,
        yarn: true
      }
    }
  }
}
