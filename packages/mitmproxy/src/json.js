import logOrConsole from '@docmirror/dev-sidecar/src/utils/util.log-or-console.js'
import JSON5 from 'json5'

// const logOrConsole = require('@docmirror/dev-sidecar/src/utils/util.log-or-console.js')
// let JSON5 = require('json5')
// if (JSON5.default) {
//   JSON5 = JSON5.default
// }

export function parse (str, defaultValue) {
  if (str == null || str.length < 2) {
    return defaultValue || {}
  }

  str = str.toString()

  if (defaultValue != null) {
    try {
      return JSON5.parse(str)
    } catch (e) {
      logOrConsole.error(`JSON5解析失败: ${e.message}，JSON内容:\r\n`, str)
      return defaultValue
    }
  } else {
    try {
      return JSON.parse(str)
    } catch (e1) {
      try {
        return JSON5.parse(str)
      } catch (e2) {
        logOrConsole.error(`JSON解析失败: ${e2.message}，JSON内容:\r\n`, str)
        return {}
      }
    }
  }
}
export function stringify (obj) {
  return JSON.stringify(obj, null, '\t')
}
export function stringify2 (obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    try {
      return JSON5.stringify(obj)
    } catch {
      return obj
    }
  }
}

export default {
  parse,
  stringify,
  stringify2,
}
