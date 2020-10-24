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
        regexp: '.*',
        proxy: 'https://raw.fastgit.org'
      }
    ],
    'github.githubassets.com': [
      {
        regexp: '.*',
        proxy: 'https://assets.fastgit.org'
      }
    ],
    'customer-stories-feed.github.com': [
      {
        regexp: '.*',
        proxy: 'https://customer-stories-feed.fastgit.org'
      }
    ],
    // google cdn
    'ajax.googleapis.com': [
      {
        regexp: '.*',
        proxy: 'https://ajax.loli.net'
      }
    ],
    'fonts.googleapis.com': [
      {
        regexp: '.*',
        proxy: 'https://fonts.loli.net'
      }
    ],
    'themes.googleapis.com': [
      {
        regexp: '.*',
        proxy: 'https://themes.loli.net'
      }
    ],
    'fonts.gstatic.com': [
      {
        regexp: '.*',
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
        regexp: '.*',
        redirect: 'https://gravatar.loli.net'
      }
    ],
    'clients*.google.com': [
      {
        regexp: '.*',
        redirect: 'https://localhost:99999'
      }
    ],
    'lh*.googleusercontent.com': [
      {
        regexp: '.*',
        redirect: 'https://localhost:99999'
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
        npm: true
      }
    }
  }
}
