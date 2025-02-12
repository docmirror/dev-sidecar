let log = console

// 将console中的日志缓存起来，当setLogger时，将控制台的日志写入日志文件
let backups = []

function backup (fun, args) {
  if (backups === null) {
    return
  }

  try {
    backups.push({
      fun,
      args,
    })

    // 最多缓存 100 条
    if (backups.length > 100) {
      backups = backups.slice(1)
    }
  } catch {
  }
}

function printBackups () {
  if (backups === null) {
    return
  }

  try {
    const backups0 = backups
    backups = null

    for (const item of backups0) {
      log[item.fun](...[`[console]`, ...item.args])
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
    log = logger

    try {
      if (backups && backups.length > 0) {
        log.info('[util.log-or-console.js] logger已设置，现将控制台的日志记录到日志文件中')
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
