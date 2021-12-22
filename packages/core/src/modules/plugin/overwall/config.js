module.exports = {
  name: '梯子',
  enabled: false, // 默认关闭梯子
  server: {},
  serverDefault: {
    'ow-prod.docmirror.top': {
      port: 443,
      path: 'X2dvX292ZXJfd2FsbF8',
      password: 'dev_sidecar_is_666'
    }
  },
  targets: {
    'github.com': true,
    '*wikimedia.org': true,
    'v2ex.com': true,
    '*azureedge.net': true,
    '*cloudfront.net': true,
    '*bing.com': true,
    '*discourse-cdn.com': true,
    '*gravatar.com': true,
    '*docker.com': true,
    '*vueuse.org': true,
    '*elastic.co': true,
    '*optimizely.com': true,
    '*stackpathcdn.com': true,
    '*fastly.net': true,
    '*cloudflare.com': true,
    '*233v2.com': true,
    '*v2fly.org': true,
    '*telegram.org': true,
    '*amazon.com': true,
    '*googleapis.com': true,
    '*cloudflareinsights.com': true,
    '*.intlify.dev': true,
    '*segment.io': true
  },
  pac: {
    enabled: true,
    // update: [
    //   'https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt'
    // ],
    pacFilePath: './extra/pac/pac.txt'
  }
}
