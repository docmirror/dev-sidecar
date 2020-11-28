const log4js = require('log4js')
const proxyConfig = require('../lib/proxy/common/config')
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
log4js.configure({
  appenders: { std: { type: 'stdout', level: 'debug' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: proxyConfig.getDefaultCABasePath() + '/logs/server.log' } },
  categories: { default: { appenders: ['file', 'std'], level: level } }
})
const logger = log4js.getLogger('server')
module.exports = logger
