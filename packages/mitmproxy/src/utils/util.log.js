const log4js = require('log4js')
const proxyConfig = require('../lib/proxy/common/config')
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
const path = require('path')
const filename = path.join(proxyConfig.getDefaultCABasePath(), '/logs/server.log')
log4js.configure({
  appenders: { std: { type: 'stdout', level: 'debug' }, file: { level: 'debug', type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename } },
  categories: { default: { appenders: ['file', 'std'], level } }
})
const logger = log4js.getLogger('server')
module.exports = logger
