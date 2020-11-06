const Shell = require('../shell')
const execute = Shell.execute
const proxyServer = require('@docmirror/mitmproxy')
const executor = {
  async windows (exec) {
    const cmds = ['start ' + proxyServer.config.getDefaultCACertPath()]
    // eslint-disable-next-line no-unused-vars
    const ret = await exec(cmds, { type: 'cmd' })
    return true
  },
  async linux (exec, { port }) {
    throw Error('暂未实现此功能')
  },
  async mac (exec, { port }) {
    throw Error('暂未实现此功能')
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
