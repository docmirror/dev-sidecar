module.exports = {
  name: 'OverWall',
  enabled: true,
  server: {
    'ow.docmirror.top/_go_over_wall_': true
  },
  targets: {
    '*facebook.com': true,
    '*.fbcdn.net': true,
    '*twitter.com': true,
    '*youtube.com': true
  },
  pac: {
    enabled: true,
    update: [
      'https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt'
    ]
  }
}
