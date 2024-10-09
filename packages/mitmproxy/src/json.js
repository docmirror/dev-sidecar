const log = require('./utils/util.log')
let JSON5 = require('json5')
if (JSON5.default) {
  JSON5 = JSON5.default
}

module.exports = {
  parse (str) {
    return JSON5.parse(str)
  },
  stringify (obj) {
    return JSON.stringify(obj, null, '\t')
  },

  // 仅用于记录日志时使用
  stringify2 (obj) {
    try {
      return JSON5.stringify(obj)
    } catch (e) {
      log.debug('转换为JSON字符串失败, error:', e, ', obj:', obj)
      return obj
    }
  }
}
