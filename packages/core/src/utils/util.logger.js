const path = require('node:path')
const log4js = require('log4js')
const config = require('../config/index')

const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

function getDefaultConfigBasePath () {
  return config.server.setting.userBasePath
}

const coreLogFilename = path.join(getDefaultConfigBasePath(), '/logs/core.log')
const guiLogFilename = path.join(getDefaultConfigBasePath(), '/logs/gui.log')
const serverLogFilename = path.join(getDefaultConfigBasePath(), '/logs/server.log')

log4js.configure({
  appenders: {
    std: { type: 'stdout' },
    core: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: coreLogFilename },
    gui: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: guiLogFilename },
    server: { level: 'debug', type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename: serverLogFilename },
  },
  categories: {
    default: { appenders: ['std'], level },
    core: { appenders: ['core', 'std'], level },
    gui: { appenders: ['gui', 'std'], level },
    server: { appenders: ['server', 'std'], level },
  },
})

module.exports = log4js
