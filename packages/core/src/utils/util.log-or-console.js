const dateUtil = require('./util.date')

// DEV_SIDECAR_LOG_DISABLED=true 时完全静默：不输出控制台，也不备份历史日志
const disabled = process.env.DEV_SIDECAR_LOG_DISABLED === 'true'

// CLI 命令（如 status）会 require core 但不会启动，若默认输出到 console 会污染命令结果。
// 当 DEV_SIDECAR_LOG_TO_CONSOLE=false 时保持静默，但仍备份，待 setLogger 后回放进日志文件
const silent = disabled || process.env.DEV_SIDECAR_LOG_TO_CONSOLE === 'false'

let log = silent
  ? { debug () {}, info () {}, warn () {}, error () {} }
  : console

// 将console中的日志缓存起来，当setLogger时，将控制台的日志写入日志文件
let backupLogs = disabled ? null : []

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
  if (log === console || silent) {
    // console 模式：带前缀输出并备份；静默模式：只备份不输出，setLogger 后回放
    if (log === console) {
      log[fun](...[`[${fun.toUpperCase()}]`, ...args])
    }
    backup(fun, args)
  } else {
    log[fun](...args)
  }
}

module.exports = {
  setLogger (logger) {
    if (disabled) {
      return
    }

    if (logger == null) {
      log.error('logger 不能为空')
      return
    }

    if (logger === log) {
      return
    }

    log = logger

    if (log !== console) {
      try {
        if (backupLogs && backupLogs.length > 0) {
          log.info('[util.log-or-console.js] 日志系统已初始化完成，现开始将历史控制台信息记录到日志文件中：')
          printBackups()
        }
      } catch {
      }
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
