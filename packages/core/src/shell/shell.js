const util = require('util')
const os = require('os')
const childProcess = require('child_process')
const _exec = childProcess.exec
const exec = util.promisify(_exec)
const PowerShell = require('node-powershell')
const log = require('../utils/util.log')
class SystemShell {
  static async exec (cmds, args) {
    throw new Error('You have to implement the method exec!')
  }
}

class LinuxSystemShell extends SystemShell {
  static async exec (cmds) {
    if (cmds instanceof String) {
      cmds = [cmds]
    }
    for (const cmd of cmds) {
      await exec(cmd)
    }
  }
}

class DarwinSystemShell extends SystemShell {
  static async exec (cmds) {
    if (cmds instanceof String) {
      cmds = [cmds]
    }
    for (const cmd of cmds) {
      await exec(cmd)
    }
  }
}

class WindowsSystemShell extends SystemShell {
  static async exec (cmds, args = { }) {
    let { type } = args
    type = type || 'ps'
    if (typeof cmds === 'string') {
      cmds = [cmds]
    }
    if (type === 'ps') {
      const ps = new PowerShell({
        executionPolicy: 'Bypass',
        noProfile: true
      })

      for (const cmd of cmds) {
        ps.addCommand(cmd)
      }

      try {
        const ret = await ps.invoke()
        // log.info('ps complete', cmds)
        return ret
      } finally {
        ps.dispose()
      }
    } else {
      let compose = 'chcp 65001  '
      for (const cmd of cmds) {
        compose += ' && ' + cmd
      }
      // compose += '&& exit'
      const ret = await childExec(compose)
      // log.info('cmd complete:', compose)
      return ret
    }
  }
}

function childExec (composeCmds) {
  return new Promise((resolve, reject) => {
    const childProcess = require('child_process')
    childProcess.exec(composeCmds, function (error, stdout, stderr) {
      if (error) {
        log.error('cmd 命令执行错误：', composeCmds, error, stderr)
        reject(error)
      } else {
        // log.info('cmd 命令完成：', stdout)
        resolve(stdout)
      }
      // log.info('关闭 cmd')
      // ps.kill('SIGINT')
    })
  })
}

function getSystemShell () {
  switch (getSystemPlatform()) {
    case 'mac':
      return DarwinSystemShell
    case 'linux':
      return LinuxSystemShell
    case 'windows':
      return WindowsSystemShell
    case 'unknown os':
    default:
      throw new Error(`UNKNOWN OS TYPE ${os.platform()}`)
  }
}
function getSystemPlatform () {
  switch (os.platform()) {
    case 'darwin':
      return 'mac'
    case 'linux':
      return 'linux'
    case 'win32':
    case 'win64':
      return 'windows'
    case 'unknown os':
    default:
      throw new Error(`UNKNOWN OS TYPE ${os.platform()}`)
  }
}

async function execute (executor, args) {
  return executor[getSystemPlatform()](getSystemShell().exec, args)
}

module.exports = {
  getSystemShell,
  getSystemPlatform,
  execute
}
