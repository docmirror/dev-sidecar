const path = require('node:path')
const log4js = require('log4js')
const logOrConsole = require('./util.log-or-console')
const defaultConfig = require('../config/index.js')
const configFromFiles = defaultConfig.configFromFiles

// 日志级别
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

// 是否完全禁用日志：不输出 stdout，也不写日志文件
const logDisabled = process.env.DEV_SIDECAR_LOG_DISABLED === 'true'

// 是否同时输出到 stdout。默认开启（GUI/开发调试需要），CLI 守护进程通过环境变量关闭
const logToConsole = !logDisabled && process.env.DEV_SIDECAR_LOG_TO_CONSOLE !== 'false'

function createNoopLogger () {
  const noop = () => {}
  return { debug: noop, info: noop, warn: noop, error: noop, level: 'off', category: 'noop' }
}

const noopLogger = logDisabled ? createNoopLogger() : null

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
  backups: Math.ceil(configFromFiles.app.keepLogFileCount) || defaultConfig.app.keepLogFileCount, // 保留日志文件数
  maxLogSize: Math.ceil((configFromFiles.app.maxLogFileSize || defaultConfig.app.maxLogFileSize) * 1024 * 1024 * (configFromFiles.app.maxLogFileSizeUnit === 'GB' ? 1024 : 1)), // 目前单位只有GB和MB
}

let log = null

// 设置一组日志配置
function log4jsConfigure (categories) {
  if (logDisabled) {
    return
  }

  if (log != null) {
    log.error('当前进程已经设置过日志配置，无法再设置更多日志配置:', categories)
    return
  }

  const config = {
    appenders: logToConsole ? { std: { type: 'stdout' } } : {},
    categories: {
      // default 分类至少需要挂一个 appender（log4js 校验要求），没有 std 时复用第一个文件 appender
      default: { appenders: logToConsole ? ['std'] : [categories[0]], level },
    },
  }

  for (const category of categories) {
    config.appenders[category] = { ...appenderConfig, filename: path.join(basePath, `/${category}.log`) }
    config.categories[category] = { appenders: logToConsole ? [category, 'std'] : [category], level }
  }

  log4js.configure(config)

  // 拿第一个日志类型来logger并设置到log变量中
  log = log4js.getLogger(categories[0])
  logOrConsole.setLogger(log)

  log.info(`设置日志配置完成，进程ID: ${process.pid}，categories：[${categories}]，config:`, JSON.stringify(config))
}

module.exports = {
  getLogger (category) {
    if (logDisabled) {
      return noopLogger
    }

    if (!category) {
      if (log) {
        log.error('未指定日志类型，无法配置并获取日志对象！！！')
      }
      throw new Error('未指定日志类型，无法配置并获取日志对象！！！')
    }

    if (category === 'core' || category === 'gui') {
      // core 和 gui 的日志配置，因为它们在同一进程中，所以一起配置，且只能配置一次
      if (log == null) {
        log4jsConfigure(['core', 'gui'])
      }

      return log4js.getLogger(category)
    } else {
      if (log == null) {
        log4jsConfigure([category])
      } else if (category !== log.category) {
        log.error(`当前进程已经设置过日志配置，无法再设置 "${category}" 的配置，先临时返回 "${log.category}" 的 log 进行日志记录。如果与其他类型的日志在同一进程中写入，请参照 core 和 gui 一起配置`)
      }

      return log
    }
  },
}
