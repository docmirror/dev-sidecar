const dateUtil = require('./util.date')

let log = console

// 将console中的日志缓存起来，当setLogger时，将控制台的日志写入日志文件
let backupLogs = []

function backup (fun, args) {
  if (backupLogs === null) {
    return
  }

  try {
    backupLogs.push({
      fun,
      args,
      time: dateUtil.format(new Date()),
    })

    // 最多缓存 100 条
    if (backupLogs.length > 100) {
      backupLogs = backupLogs.slice(1)
    }
  } catch {
  }
}

function printBackups () {
  if (backupLogs === null || log === console) {
    return
  }

  try {
    const backups = backupLogs
    backupLogs = null // 先置空历史消息对象，再记录日志

    for (const item of backups) {
      log[item.fun](...[`[${item.time}] console -`, ...item.args])
    }
  } catch {
  }
}

function _doLog (fun, args) {
  if (log === console) {
    log[fun](...[`[${fun.toUpperCase()}]`, ...args])
    backup(fun, args) // 控制台日志备份起来
  } else {
    log[fun](...args)
  }
}

module.exports = {
  setLogger (logger) {
    if (logger == null) {
      log.error('logger 不能为空')
      return
    }

    log = logger

    try {
      if (backupLogs && backupLogs.length > 0) {
        log.info('[util.log-or-console.js] 日志系统已初始化完成，现开始将历史控制台信息记录到日志文件中：')
        printBackups()
      }
    } catch {
    }
  },

  debug (...args) {
    _doLog('debug', args)
  },
  info (...args) {
    _doLog('info', args)
  },
  warn (...args) {
    _doLog('warn', args)
  },
  error (...args) {
    _doLog('error', args)
  },
}
