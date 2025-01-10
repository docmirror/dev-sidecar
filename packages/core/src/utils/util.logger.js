const path = require('node:path')
const log4js = require('log4js')
const configFromFiles = require('../config/index').configFromFiles

const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

function getDefaultConfigBasePath () {
  if (configFromFiles.app.logFileSavePath) {
    let logFileSavePath = configFromFiles.app.logFileSavePath
    if (logFileSavePath.endsWith('/') || logFileSavePath.endsWith('\\')) {
      logFileSavePath = logFileSavePath.slice(0, -1)
    }
    // eslint-disable-next-line no-template-curly-in-string
    return logFileSavePath.replace('${userBasePath}', configFromFiles.server.setting.userBasePath)
  } else {
    return path.join(configFromFiles.server.setting.userBasePath, '/logs')
  }
}

// 日志文件名
const coreLogFilename = path.join(getDefaultConfigBasePath(), '/core.log')
const guiLogFilename = path.join(getDefaultConfigBasePath(), '/gui.log')
const serverLogFilename = path.join(getDefaultConfigBasePath(), '/server.log')

// 日志相关配置
const backups = configFromFiles.app.keepLogFileCount // 保留日志文件数
const appenderConfig = {
  type: 'file',
  pattern: 'yyyy-MM-dd',
  keepFileExt: true, // 保留日志文件扩展名
  compress: true, // 压缩日志文件

  // 以下三个配置都设置，兼容新旧版本
  backups,
  numBackups: backups,
  daysToKeep: backups,
}

// 设置日志配置
log4js.configure({
  appenders: {
    std: { type: 'stdout' },
    core: { ...appenderConfig, filename: coreLogFilename },
    gui: { ...appenderConfig, filename: guiLogFilename },
    server: { ...appenderConfig, filename: serverLogFilename },
  },
  categories: {
    default: { appenders: ['std'], level },
    core: { appenders: ['core', 'std'], level },
    gui: { appenders: ['gui', 'std'], level },
    server: { appenders: ['server', 'std'], level },
  },
})

module.exports = log4js
