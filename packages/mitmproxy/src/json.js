let JSON5 = require('json5')
if (JSON5.default) {
  JSON5 = JSON5.default
}

let log = console // 默认使用console，日志系统初始化完成后，设置为 logger
function setLogger (logger) {
  log = logger
}

module.exports = {
  parse (str, defaultValue) {
    if (str == null || str.length < 2) {
      return defaultValue || {}
    }

    str = str.toString()

    if (defaultValue != null) {
      try {
        return JSON5.parse(str)
      } catch (e) {
        log.error(`JSON5解析失败: ${e.message}，JSON内容:\r\n`, str)
        return defaultValue
      }
    } else {
      return JSON5.parse(str)
    }
  },
  stringify (obj) {
    return JSON.stringify(obj, null, '\t')
  },

  // 仅用于记录日志时使用
  stringify2 (obj) {
    try {
      return JSON.stringify(obj)
    } catch {
      try {
        return JSON5.stringify(obj)
      } catch {
        return obj
      }
    }
  },

  setLogger,
}
