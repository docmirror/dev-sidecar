/**
 * 获取环境变量
 */
const Shell = require('../shell')
const execute = Shell.execute
const executor = {
  async windows (exec) {
    const ret = await exec(['npm config list --json'], { type: 'cmd' })
    if (ret != null) {
      const json = ret.substring(ret.indexOf('{'))
      return JSON.parse(json)
    }
    return {}
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
