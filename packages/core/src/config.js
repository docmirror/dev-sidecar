const fs = require('fs')
const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
const JSON5 = require('json5').default
const request = require('request')
const path = require('path')
const log = require('./utils/util.log')
const mergeApi = require('./merge.js')

let configTarget = lodash.cloneDeep(defConfig)

function get () {
  return configTarget
}

const getDefaultConfigBasePath = function () {
  return get().server.setting.userBasePath
}
function _getRemoteSavePath (prefix = '') {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return path.join(dir, prefix + 'remote_config.json5')
}
function _getConfigPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir + '/config.json5'
}

let timer
const configApi = {
  async startAutoDownloadRemoteConfig () {
    if (timer != null) {
      clearInterval(timer)
    }
    const download = async () => {
      try {
        await configApi.downloadRemoteConfig()
        configApi.reload()
      } catch (e) {
        log.error(e)
      }
    }
    await download()
    timer = setInterval(download, 24 * 60 * 60 * 1000) // 1天
  },
  downloadRemoteConfig () {
    if (get().app.remoteConfig.enabled !== true) {
      return
    }
    const remoteConfigUrl = get().app.remoteConfig.url
    // eslint-disable-next-line handle-callback-err
    return new Promise((resolve, reject) => {
      log.info('下载远程配置：', remoteConfigUrl)
      request(remoteConfigUrl, (error, response, body) => {
        if (error) {
          log.error('下载远程配置失败', error)
          reject(error)
          return
        }
        if (response && response.statusCode === 200) {
          const originalRemoteSavePath = _getRemoteSavePath('original_')
          fs.writeFileSync(originalRemoteSavePath, body)
          log.info('保存原来的远程配置文件成功:', originalRemoteSavePath)

          // 尝试解析远程配置，如果解析失败，则不保存它
          let remoteConfig
          try {
            remoteConfig = JSON5.parse(body)
          } catch (e) {
            log.error('远程配置内容格式不正确:', body)
            remoteConfig = null
          }

          if (remoteConfig != null) {
            const remoteSavePath = _getRemoteSavePath()
            fs.writeFileSync(remoteSavePath, JSON.stringify(remoteConfig, null, '\t'))
            log.info('保存远程配置文件成功:', remoteSavePath)
          }

          resolve()
        } else {
          const message = '下载远程配置失败:' + response.message + ',code:' + response.statusCode
          log.error(message)
          reject(new Error(message))
        }
      })
    })
  },
  readRemoteConfig () {
    if (get().app.remoteConfig.enabled !== true) {
      return {}
    }
    try {
      const path = _getRemoteSavePath()
      if (fs.existsSync(path)) {
        log.info('读取远程配置文件:', path)
        const file = fs.readFileSync(path)
        return JSON5.parse(file.toString())
      } else {
        log.warn('远程配置文件不存在:', path)
      }
    } catch (e) {
      log.warn('远程配置读取失败:', e)
    }

    return {}
  },
  /**
   * 保存自定义的 config
   * @param newConfig
   */
  save (newConfig) {
    // 对比默认config的异同
    let defConfig = configApi.getDefault()

    // 如果开启了远程配置，则读取远程配置，合并到默认配置中
    if (get().app.remoteConfig.enabled === true) {
      defConfig = mergeApi.doMerge(defConfig, configApi.readRemoteConfig())
    }

    // 计算新配置与默认配置（启用远程配置时，含远程配置）的差异，并保存到 config.json5 中
    const diffConfig = mergeApi.doDiff(defConfig, newConfig)
    const configPath = _getConfigPath()
    fs.writeFileSync(configPath, JSON.stringify(diffConfig, null, '\t'))
    log.info('保存自定义配置文件成功:', configPath)
    configApi.reload()
    return diffConfig
  },
  doMerge: mergeApi.doMerge,
  doDiff: mergeApi.doDiff,
  /**
   * 读取 config.json5 后，合并配置
   * @returns {*}
   */
  reload () {
    const path = _getConfigPath()
    let userConfig
    if (!fs.existsSync(path)) {
      userConfig = {}
    } else {
      const file = fs.readFileSync(path)
      userConfig = JSON5.parse(file.toString())
    }

    const config = configApi.set(userConfig)
    return config || {}
  },
  update (partConfig) {
    const newConfig = lodash.merge(configApi.get(), partConfig)
    configApi.save(newConfig)
  },
  get,
  set (newConfig) {
    if (newConfig == null) {
      return configTarget
    }

    const merged = lodash.cloneDeep(defConfig)
    const remoteConfig = configApi.readRemoteConfig()

    mergeApi.doMerge(merged, remoteConfig)
    mergeApi.doMerge(merged, newConfig)
    mergeApi.deleteNullItems(merged)
    configTarget = merged
    log.info('加载配置完成')

    return configTarget
  },
  getDefault () {
    return lodash.cloneDeep(defConfig)
  },
  addDefault (key, defValue) {
    lodash.set(defConfig, key, defValue)
  },
  resetDefault (key) {
    if (key) {
      let value = lodash.get(defConfig, key)
      value = lodash.cloneDeep(value)
      lodash.set(configTarget, key, value)
    } else {
      configTarget = lodash.cloneDeep(defConfig)
    }
    return configTarget
  },
  async getVariables (type) {
    const method = type === 'npm' ? Shell.getNpmEnv : Shell.getSystemEnv
    const currentMap = await method()
    const list = []
    const map = configTarget.variables[type]
    for (const key in map) {
      const exists = currentMap[key] != null
      list.push({
        key,
        value: map[key],
        exists
      })
    }
    return list
  },
  async setVariables (type) {
    const list = await configApi.getVariables(type)
    const noSetList = list.filter(item => {
      return !item.exists
    })
    if (list.length > 0) {
      const context = {
        root_ca_cert_path: configApi.get().server.setting.rootCaFile.certPath
      }
      for (const item of noSetList) {
        if (item.value.indexOf('${') >= 0) {
          for (const key in context) {
            item.value = item.value.replcace(new RegExp('${' + key + '}', 'g'), context[key])
          }
        }
      }
      const method = type === 'npm' ? Shell.setNpmEnv : Shell.setSystemEnv
      return method({ list: noSetList })
    }
  }
}

module.exports = configApi
