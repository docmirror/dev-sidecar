const path = require('node:path')
const log4js = require('log4js')
const configFromFiles = require('../config/index').configFromFiles

// 日志级别
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

// 日志文件目录
const basePath = getDefaultConfigBasePath()

// 通用日志配置
const appenderConfig = {
  type: 'file',
  pattern: 'yyyy-MM-dd',
  compress: true, // 压缩日志文件
  keepFileExt: true, // 保留日志文件扩展名为 .log
  backups: configFromFiles.app.keepLogFileCount, // 保留日志文件数
}

// 设置一组日志配置
function log4jsConfigure (categories) {
  const config = {
    appenders: {
      std: { type: 'stdout' },
    },
    categories: {
      default: { appenders: ['std'], level },
    },
  }

  for (const category of categories) {
    config.appenders[category] = { ...appenderConfig, filename: path.join(basePath, `/${category}.log`) }
    config.categories[category] = { appenders: [category, 'std'], level }
  }

  log4js.configure(config)
}

function getLogger (category) {
  if (category === 'core' || category === 'gui') {
    // core 和 gui 的日志配置，因为它们在同一进程中，所以一起配置，且只能配置一次
    if (!log4js.isConfigured()) {
      log4jsConfigure(['core', 'gui'])
    }
  } else {
    if (!log4js.isConfigured()) {
      log4jsConfigure([category])
    } else {
      throw new Error(`当前进程已经设置过日志配置，无法设置 "${category}" 的配置，如果与其他类型的日志在同一进程是写入，请参照 core 和 gui 单独设置`)
    }
  }

  return log4js.getLogger(category)
}

module.exports = {
  getLogger,
}
