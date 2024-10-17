/**
 * 自动兼容程序自适应生成配置
 * 此脚本会针对各种兼容性问题，为对应域名生成相应的兼容性配置，并将自适应配置写入到 `~/.dev-sidecar/automaticCompatibleConfig.json` 文件中。
 * 当然，也有可能会生成错误的配置，导致无法兼容，这时候可以通过 `config.server.compatible` 配置项，来覆盖这里生成的配置，达到主动适配的效果。
 *
 * @author WangLiang
 */
const fs = require('fs')
const path = require('path')
const jsonApi = require('../../../json')
const log = require('../../../utils/util.log')
const matchUtil = require('../../../utils/util.match')

const defaultConfig = {
  // connect阶段所需的兼容性配置
  connect: {
    // 参考配置
    // 'xxx.xxx.xxx.xxx:443': {
    //   ssl: false
    // }
  },
  // request阶段所需的兼容性配置
  request: {
    // 参考配置
    // 'xxx.xxx.xxx.xxx:443': {
    //   rejectUnauthorized: false
    // }
  }
}

const config = _loadFromFile(defaultConfig)

function _getConnectConfig (hostname, port) {
  const connectConfig = config.connect[`${hostname}:${port}`]
  log.info(`getConnectConfig: ${hostname}:${port}, ${jsonApi.stringify2(connectConfig)}`)
  return connectConfig
}
function _getRequestConfig (hostname, port) {
  const requestConfig = config.request[`${hostname}:${port}`]
  log.info(`getRequestConfig: ${hostname}:${port}, ${jsonApi.stringify2(requestConfig)}`)
  return requestConfig
}

// region 本地配置文件所需函数

function _getConfigPath () {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  const dir = path.resolve(userHome, './.dev-sidecar')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return path.join(dir, '/automaticCompatibleConfig.json')
}

function _loadFromFile (defaultConfig) {
  const configPath = _getConfigPath()
  let config
  if (!fs.existsSync(configPath)) {
    config = defaultConfig
    log.info('automaticCompatibleConfig.json 文件不存在，使用默认配置:', configPath)
  } else {
    const file = fs.readFileSync(configPath)
    log.info('读取 automaticCompatibleConfig.json 成功:', configPath)
    const fileStr = file.toString()
    config = fileStr && fileStr.length > 2 ? jsonApi.parse(fileStr) : defaultConfig
    if (config.connect == null) config.connect = defaultConfig.connect
    if (config.request == null) config.request = defaultConfig.request
  }

  return config
}

function _saveConfigToFile () {
  const filePath = _getConfigPath()
  try {
    fs.writeFileSync(filePath, jsonApi.stringify(config))
    log.info('保存 automaticCompatibleConfig.json 成功:', filePath)
  } catch (e) {
    log.error('保存 automaticCompatibleConfig.json 失败:', filePath, e)
  }
}

// endregion

module.exports = {
  /**
   * 获取 connect 阶段所需的兼容性配置
   *
   * @param hostname 域名
   * @param port     端口
   * @param manualCompatibleConfig 手动兼容性配置
   * @returns connect阶段所需的兼容性配置
   */
  getConnectCompatibleConfig (hostname, port, manualCompatibleConfig = null) {
    let connectCompatibleConfig = manualCompatibleConfig == null ? null : matchUtil.matchHostname(manualCompatibleConfig.connect, `${hostname}:${port}`, 'getConnectCompatibleConfig')
    if (connectCompatibleConfig == null) {
      connectCompatibleConfig = _getConnectConfig(hostname, port)
    }
    return connectCompatibleConfig
  },

  setConnectSsl (hostname, port, ssl, autoSave = true) {
    const connectCompatibleConfig = this.getConnectCompatibleConfig(hostname, port)
    if (connectCompatibleConfig) {
      connectCompatibleConfig.ssl = ssl
    } else {
      config.connect[`${hostname}:${port}`] = { ssl }
    }

    // 配置保存到文件
    if (autoSave) _saveConfigToFile()

    log.info(`【自动兼容程序】${hostname}:${port}: 设置 connect.ssl = ${ssl}`)
  },

  // --------------------------------------------------------------------------------------------------------------------------

  /**
   * 获取 request 阶段所需的兼容性配置
   *
   * @param rOptions
   * @param manualCompatibleConfig
   */
  getRequestCompatibleConfig (rOptions, manualCompatibleConfig = null) {
    let requestCompatibleConfig = manualCompatibleConfig == null ? null : matchUtil.matchHostname(manualCompatibleConfig.request, `${rOptions.hostname}:${rOptions.port}`, 'getRequestCompatibleConfig')
    if (requestCompatibleConfig == null) {
      requestCompatibleConfig = _getRequestConfig(rOptions.hostname, rOptions.port)
    }
    return requestCompatibleConfig
  },

  setRequestRejectUnauthorized (rOptions, rejectUnauthorized, autoSave = true) {
    const requestCompatibleConfig = this.getRequestCompatibleConfig(rOptions.hostname, rOptions.port)
    if (requestCompatibleConfig) {
      requestCompatibleConfig.rejectUnauthorized = rejectUnauthorized
    } else {
      config.request[`${rOptions.hostname}:${rOptions.port}`] = { rejectUnauthorized }
    }

    // 配置保存到文件
    if (autoSave) _saveConfigToFile()

    log.info(`【自动兼容程序】${rOptions.hostname}:${rOptions.port}: 设置 request.rejectUnauthorized = ${rejectUnauthorized}`)
  }
}
