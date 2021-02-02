const Shell = require('../shell')
const execute = Shell.execute
const executor = {
  async windows (exec, { certPath }) {
    const cmds = ['start "" "' + certPath + '"']
    // eslint-disable-next-line no-unused-vars
    const ret = await exec(cmds, { type: 'cmd' })
    return true
  },
  async linux (exec, { certPath }) {
    const cmds = ['open "' + certPath + '"']
    // eslint-disable-next-line no-unused-vars
    const ret = await exec(cmds, { type: 'cmd' })
    return true
  },
  async mac (exec, { certPath }) {
    const cmds = ['open "' + certPath + '"']
    // eslint-disable-next-line no-unused-vars
    const ret = await exec(cmds, { type: 'cmd' })
    return true
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
