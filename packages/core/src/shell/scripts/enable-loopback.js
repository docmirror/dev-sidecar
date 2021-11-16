/**
 */
const Shell = require('../shell')
const extraPath = require('./extra-path')
const execute = Shell.execute
const executor = {
  async windows (exec) {
    const loopbackPath = extraPath.getEnableLoopbackPath()
    const execFile = Shell.execFile
    await execFile(loopbackPath)
  },
  async linux (exec, { port }) {
    throw Error('不支持此操作')
  },
  async mac (exec, { port }) {
    throw Error('不支持此操作')
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
