const util = require('util')
const os = require('os')
const childProcess = require('child_process')
const _exec = childProcess.exec
const _execFile = childProcess.execFile
const exec = util.promisify(_exec)
const PowerShell = require('node-powershell')
const log = require('../utils/util.log')
const fixPath = require('fix-path')
const iconv = require('iconv-lite')
fixPath()
class SystemShell {
  static async exec (cmds, args) {
    throw new Error('You have to implement the method exec!')
  }
}

class LinuxSystemShell extends SystemShell {
  static async exec (cmds) {
    if (typeof cmds === 'string') {
      cmds = [cmds]
    }
    for (const cmd of cmds) {
      await childExec(cmd)
    }
  }
}

class DarwinSystemShell extends SystemShell {
  static async exec (cmds) {
    if (typeof cmds === 'string') {
      cmds = [cmds]
    }
    let ret
    for (const cmd of cmds) {
      ret = await childExec(cmd)
    }
    return ret
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
      let compose = 'echo  "test" ' // 'chcp 65001  '
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

    var encoding = 'cp936'
    var binaryEncoding = 'binary'

    const childProcess = require('child_process')
    childProcess.exec(composeCmds, { encoding: binaryEncoding }, function (error, stdout, stderr) {
      if (error) {
        // console.log('------', decoder.decode(stderr))
        const message = iconv.decode(Buffer.from(stderr, binaryEncoding), encoding)
        log.error('cmd 命令执行错误：', composeCmds, message)
        reject(new Error(message))
      } else {
        // log.info('cmd 命令完成：', stdout)
        const message = iconv.decode(Buffer.from(stdout, binaryEncoding), encoding)
        resolve(message)
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

async function execFile (file, args, options) {
  return new Promise((resolve, reject) => {
    _execFile(file, args, options, (err, stdout) => {
      if (err) {
        log.error('文件执行出错：', file, err)
        reject(err)
        return
      }
      log.debug('执行成功：', stdout)
      resolve(stdout)
    })
  })
}

module.exports = {
  getSystemShell,
  getSystemPlatform,
  execute,
  execFile
}
