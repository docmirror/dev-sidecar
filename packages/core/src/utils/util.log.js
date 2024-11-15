const path = require('path')
const log4js = require('log4js')
const config = require('../config/index')

const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

function getDefaultConfigBasePath () {
  return config.server.setting.userBasePath
}

const filename = path.join(getDefaultConfigBasePath(), '/logs/core.log')
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename } },
  categories: { default: { appenders: ['file', 'std'], level } },
})
const logger = log4js.getLogger('core')
module.exports = logger
