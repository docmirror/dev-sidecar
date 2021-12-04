const fs = require('fs')
const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
const JSON5 = require('json5').default
const request = require('request')
const path = require('path')
const log = require('./utils/util.log')
let configTarget = lodash.cloneDeep(defConfig)

function get () {
  return configTarget
}

function _deleteDisabledItem (target) {
  lodash.forEach(target, (item, key) => {
    if (item == null) {
      delete target[key]
    }
    if (lodash.isObject(item)) {
      _deleteDisabledItem(item)
    }
  })
}
const getDefaultConfigBasePath = function () {
  return get().server.setting.userBasePath
}
function _getRemoteSavePath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return path.join(dir, 'remote_config.json5')
}
function _getConfigPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir + '/config.json5'
}

function doMerge (defObj, newObj) {
  if (newObj == null) {
    return defObj
  }
  const defObj2 = { ...defObj }
  const newObj2 = {}
  for (const key in newObj) {
    const newValue = newObj[key]
    const defValue = defObj[key]
    if (newValue != null && defValue == null) {
      newObj2[key] = newValue
      continue
    }
    if (lodash.isEqual(newValue, defValue)) {
      delete defObj2[key]
      continue
    }

    if (lodash.isArray(newValue)) {
      delete defObj2[key]
      newObj2[key] = newValue
      continue
    }
    if (lodash.isObject(newValue)) {
      newObj2[key] = doMerge(defValue, newValue)
      delete defObj2[key]
      continue
    } else {
      // 基础类型，直接覆盖
      delete defObj2[key]
      newObj2[key] = newValue
      continue
    }
  }
  // defObj 里面剩下的是被删掉的
  lodash.forEach(defObj2, (defValue, key) => {
    newObj2[key] = null
  })
  return newObj2
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
          fs.writeFileSync(_getRemoteSavePath(), body)
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
      log.info('读取合并远程配置文件:', path)
      if (fs.existsSync(path)) {
        const file = fs.readFileSync(path)
        return JSON5.parse(file.toString())
      }
    } catch (e) {
      log.info('远程配置读取有误', e)
    }

    return {}
  },
  /**
   * 保存自定义的 config
   * @param newConfig
   * @param remoteConfig //远程配置
   */
  save (newConfig) {
    // 对比默认config的异同
    // configApi.set(newConfig)
    const defConfig = configApi.getDefault()
    if (get().app.remoteConfig.enabled === true) {
      doMerge(defConfig, configApi.readRemoteConfig())
    }
    const saveConfig = doMerge(defConfig, newConfig)
    fs.writeFileSync(_getConfigPath(), JSON5.stringify(saveConfig, null, 2))
    configApi.reload()
    return saveConfig
  },
  doMerge,
  /**
   * 读取后合并配置
   * @returns {*}
   */
  reload () {
    const path = _getConfigPath()
    if (!fs.existsSync(path)) {
      return configApi.get()
    }
    const file = fs.readFileSync(path)
    const userConfig = JSON5.parse(file.toString())
    configApi.set(userConfig)
    const config = configApi.get()
    return config || {}
  },
  update (partConfig) {
    const newConfig = lodash.merge(configApi.get(), partConfig)
    configApi.save(newConfig)
  },
  get,
  set (newConfig) {
    if (newConfig == null) {
      return
    }
    const merged = lodash.cloneDeep(newConfig)
    const clone = lodash.cloneDeep(defConfig)
    function customizer (objValue, srcValue) {
      if (lodash.isArray(objValue)) {
        return srcValue
      }
    }
    lodash.mergeWith(merged, clone, customizer)
    lodash.mergeWith(merged, configApi.readRemoteConfig(), customizer)
    lodash.mergeWith(merged, newConfig, customizer)
    _deleteDisabledItem(merged)
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
