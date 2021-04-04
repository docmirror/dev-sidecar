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
    '*facebook.com': true,
    'github.com': true,
    '*wikimedia.org': true
  },
  pac: {
    enabled: true,
    update: [
      'https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt'
    ]
  }
}
