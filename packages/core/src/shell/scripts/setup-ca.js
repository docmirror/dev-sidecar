const Shell = require('../shell')
const sudoPrompt = require('@vscode/sudo-prompt')

const execute = Shell.execute

const executor = {
  async windows (exec, { certPath }) {
    const cmds = [`start "" "${certPath}"`]
    await exec(cmds, { type: 'cmd' })
    return true
  },
  linux (exec, { certPath }) {
    return new Promise((resolve, reject) => {
      sudoPrompt.exec(`cp ${certPath} /usr/local/share/ca-certificates && update-ca-certificates`, { name: 'SetupCa' }, (error) => {
        if (error) {
          reject(new Error(`安装根证书失败：${error.message}`))
        } else {
          resolve(true)
        }
      })
    })
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
