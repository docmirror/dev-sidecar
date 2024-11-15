const Shell = require('../shell')

const execute = Shell.execute

const executor = {
  async windows (exec, { certPath }) {
    const cmds = [`start "" "${certPath}"`]
    await exec(cmds, { type: 'cmd' })
    return true
  },
  async linux (exec, { certPath }) {
    const cmds = [`sudo cp ${certPath} /usr/local/share/ca-certificates`, 'sudo update-ca-certificates ']
    await exec(cmds)
    return true
  },
  async mac (exec, { certPath }) {
    const cmds = [`open "${certPath}"`]
    await exec(cmds, { type: 'cmd' })
    return true
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
