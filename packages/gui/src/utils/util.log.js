const log4js = require('log4js')
const DevSidecar = require('@docmirror/dev-sidecar')
const getDefaultConfigBasePath = function () {
  return DevSidecar.api.config.get().server.setting.userBasePath
}
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
const path = require('path')
const filename = path.join(getDefaultConfigBasePath(), '/logs/gui.log')
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename } },
  categories: { default: { appenders: ['file', 'std'], level } }
})
const logger = log4js.getLogger('gui')
module.exports = logger
