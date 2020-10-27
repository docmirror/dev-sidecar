/**
 * 设置环境变量
 */
const Shell = require('../shell')
const execute = Shell.execute
const executor = {
  async windows (exec, { list }) {
    const cmds = []
    for (const item of list) {
      // [Environment]::SetEnvironmentVariable('FOO', 'bar', 'Machine')
      cmds.push(`[Environment]::SetEnvironmentVariable('${item.key}', '${item.value}', 'Machine')`)
    }
    const ret = await exec(cmds, { type: 'ps' })
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
