const log4js = require('log4js')
const config = require('../config/index')
function getDefaultConfigBasePath () {
  return config.server.setting.userBasePath
}
const path = require('path')
const filename = path.join(getDefaultConfigBasePath(), '/logs/core.log')
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename } },
  categories: { default: { appenders: ['file', 'std'], level: 'info' } }
})
const logger = log4js.getLogger('server')
module.exports = logger
