module.exports = {
  name: '增强功能',
  enabled: false, // 默认关闭
  restartServer: true, // 首页开关切换后需要重启代理服务才能生效
  server: {},
  serverDefault: {
    'ow-prod.docmirror.top': {
      id: 0, // 自带默认服务器 ID 固定为 0，用户新增服务器依次为 1、2、3...
      port: 443,
      path: 'X2dvX292ZXJfd2FsbF8',
      password: 'dev_sidecar_is_666',
    },
  },
  targets: {
    '*.github.com': true,
    '*github*.com': true,
    '*.wikimedia.org': true,
    '*.v2ex.com': true,
    '*.azureedge.net': true,
    '*.cloudfront.net': true,
    '*.bing.com': true,
    '*.discourse-cdn.com': true,
    '*.gravatar.com': true,
    '*.docker.com': true,
    '*.vueuse.org': true,
    '*.elastic.co': true,
    '*.optimizely.com': true,
    '*.stackpathcdn.com': true,
    '*.fastly.net': true,
    '*.cloudflare.com': true,
    '*.233v2.com': true,
    '*.v2fly.org': true,
    '*.telegram.org': true,
    '*.amazon.com': true,
    '*.googleapis.com': true,
    '*.google-analytics.com': true,
    '*.cloudflareinsights.com': true,
    '*.intlify.dev': true,
    '*.segment.io': true,
    '*.shields.io': true,
    '*.jsdelivr.net': true,
  },
  pac: {
    enabled: true,
    autoUpdate: true,
    pacFileUpdateUrl: 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt',
    pacFileAbsolutePath: null, // 自定义 pac.txt 文件位置，可以是本地文件路径
    pacFilePath: './extra/pac/pac.txt', // 内置 pac.txt 文件路径
  },
}
