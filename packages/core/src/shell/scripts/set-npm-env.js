/**
 * 设置环境变量
 */
const Shell = require('../shell')
const execute = Shell.execute
const executor = {
  async windows (exec, { list }) {
    const cmds = []
    for (const item of list) {
      cmds.push(`npm config set ${item.key}  ${item.value}`)
    }
    const ret = await exec(cmds, { type: 'cmd' })
    return ret
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
