const log4js = require('log4js')
const proxyConfig = require('../lib/proxy/common/config')
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: proxyConfig.getDefaultCABasePath() + '/logs/server.log' } },
  categories: { default: { appenders: ['file', 'std'], level: 'info' } }
})
const logger = log4js.getLogger('server')
module.exports = logger
