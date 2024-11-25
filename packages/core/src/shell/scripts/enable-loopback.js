/**
 */
const Shell = require('../shell')
const extraPath = require('./extra-path')
const sudoPrompt = require('@vscode/sudo-prompt')
const log = require('../../utils/util.log')
const execute = Shell.execute

const executor = {
  windows (exec) {
    const loopbackPath = extraPath.getEnableLoopbackPath()
    const sudoCommand = [`"${loopbackPath}"`]

    const options = {
      name: 'EnableLoopback',
    }
    return new Promise((resolve, reject) => {
      sudoPrompt.exec(
        sudoCommand.join(' '),
        options,
        (error, _, stderr) => {
          if (stderr) {
            log.error(`[sudo-prompt] 发生错误: ${stderr}`)
          }

          if (error) {
            reject(error)
          } else {
            resolve(undefined)
          }
        },
      )
    })
  },
  async linux (exec, { port }) {
    throw new Error('不支持此操作')
  },
  async mac (exec, { port }) {
    throw new Error('不支持此操作')
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
