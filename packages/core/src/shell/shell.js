const childProcess = require('node:child_process')
const os = require('node:os')
const fixPath = require('fix-path')
const iconv = require('iconv-lite')
const PowerShell = require('node-powershell')
const log = require('../utils/util.log')

const _execFile = childProcess.execFile

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
      await _childExec(cmd, { shell: '/bin/bash' })
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
      ret = await _childExec(cmd)
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
        noProfile: true,
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
        compose += ` && ${cmd}`
      }
      // compose += '&& exit'
      const ret = await childExec(compose, args)
      // log.info('cmd complete:', compose)
      return ret
    }
  }
}

function _childExec (composeCmds, options = {}) {
  return new Promise((resolve, reject) => {
    const childProcess = require('node:child_process')
    log.info('shell:', composeCmds)
    childProcess.exec(composeCmds, options, (error, stdout, stderr) => {
      if (error) {
        if (options.printErrorLog !== false) {
          log.error('cmd 命令执行错误：\n===>\ncommands:', composeCmds, '\n   error:', error, '\n<===')
        }
        reject(new Error(stderr))
      } else {
        // log.info('cmd 命令完成：', stdout)
        resolve(stdout)
      }
      // log.info('关闭 cmd')
      // ps.kill('SIGINT')
    })
  })
}

function childExec (composeCmds, options = {}) {
  return new Promise((resolve, reject) => {
    const encoding = 'cp936'
    const binaryEncoding = 'binary'

    const childProcess = require('node:child_process')
    log.info('shell:', composeCmds)
    childProcess.exec(composeCmds, { encoding: binaryEncoding }, (error, stdout, stderr) => {
      if (error) {
        // console.log('------', decoder.decode(stderr))
        const message = iconv.decode(Buffer.from(stderr, binaryEncoding), encoding)
        if (options.printErrorLog !== false) {
          log.error('cmd 命令执行错误：\n------------------------------\ncommands:', composeCmds, '\n message:', message, '\n   error:', error, '\n------------------------------')
        }
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
      return 'windows'
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
    try {
      _execFile(file, args, options, (err, stdout) => {
        if (err) {
          log.error('文件执行出错：', file, err)
          reject(err)
          return
        }
        log.debug('文件执行成功：', file)
        resolve(stdout)
      })
    } catch (e) {
      log.error('文件执行出错：', file, e)
      reject(e)
    }
  })
}

module.exports = {
  getSystemShell,
  getSystemPlatform,
  execute,
  execFile,
}
