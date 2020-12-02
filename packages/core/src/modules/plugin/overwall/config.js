module.exports = {
  name: '梯子',
  enabled: false,
  server: {
    'ow.docmirror.top/_go_over_wall_': true
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
