/**
 */
const Shell = require('../shell')
const extraPath = require('./extra-path')
const sudo = require('../sudo')
const execute = Shell.execute

const executor = {
  windows(exec) {
    const loopbackPath = extraPath.getEnableLoopbackPath()
    const sudoCommand = `"${loopbackPath}"`

    return sudo(sudoCommand, { name: 'EnableLoopback' })
  },
  async linux(exec, { port }) {
    throw new Error('不支持此操作')
  },
  async mac(exec, { port }) {
    throw new Error('不支持此操作')
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
