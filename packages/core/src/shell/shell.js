const util = require('util')
const os = require('os')
const childProcess = require('child_process')
const _exec = childProcess.exec
const exec = util.promisify(_exec)
const Shell = require('node-powershell')

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
  static async exec (cmds, args = { type: 'ps' }) {
    const { type } = args
    if (cmds instanceof String) {
      cmds = [cmds]
    }
    if (type === 'ps') {
      const ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
      })

      for (const cmd of cmds) {
        ps.addCommand(cmd)
      }

      const ret = await ps.invoke()
      console.log('ps complete:', cmds, ret)
      return ret
    } else {
      let compose = 'chcp 65001  '
      for (const cmd of cmds) {
        compose += ' && ' + cmd
      }
      return new Promise((resolve, reject) => {
        childProcess.exec(compose, function (error, stdout, stderr) {
          if (error) {
            console.error('cmd 命令执行错误：', compose, error, stderr)
            reject(error)
          } else {
            const data = stdout
            resolve(data)
          }
        })
      })
    }
  }
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
