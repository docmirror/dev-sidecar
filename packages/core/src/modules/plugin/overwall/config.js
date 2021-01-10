module.exports = {
  name: '梯子',
  enabled: true,
  server: {
  },
  serverDefault: {
    'ow-prod.docmirror.top': {
      path: 'X2dvX292ZXJfd2FsbF8',
      password: 'dev_sidecar_is_666'
    }
  },
  targets: {
    '*facebook.com': true
  },
  pac: {
    enabled: true,
    update: [
      'https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt'
    ]
  }
}
