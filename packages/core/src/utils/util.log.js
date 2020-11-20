const log4js = require('log4js')
const path = require('path')
const getDefaultConfigBasePath = function () {
  const userHome = process.env.HOME || process.env.USERPROFILE
  return path.resolve(userHome, './.dev-sidecar')
}
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: getDefaultConfigBasePath() + '/logs/core.log' } },
  categories: { default: { appenders: ['file', 'std'], level: 'info' } }
})
const logger = log4js.getLogger('server')
module.exports = logger
