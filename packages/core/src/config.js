const fs = require('fs')
const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
const jsonApi = require('@docmirror/mitmproxy/src/json')
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
  return path.join(dir, 'config.json')
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
        log.error('定时下载远程配置并重载配置失败', e)
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
      log.info('开始下载远程配置:', remoteConfigUrl)
      request(remoteConfigUrl, (error, response, body) => {
        if (error) {
          log.error('下载远程配置失败, error:', error, ', response:', response, ', body:', body)
          reject(error)
          return
        }
        if (response && response.statusCode === 200) {
          if (body == null || body.length < 2) {
            log.warn('下载远程配置成功，但内容为空:', remoteConfigUrl)
            resolve()
            return
          } else {
            log.info('下载远程配置成功:', remoteConfigUrl)
          }

          // 尝试解析远程配置，如果解析失败，则不保存它
          let remoteConfig
          try {
            remoteConfig = jsonApi.parse(body)
          } catch (e) {
            log.error(`远程配置内容格式不正确, url: ${remoteConfigUrl}, body: ${body}`)
            remoteConfig = null
          }

          if (remoteConfig != null) {
            const remoteSavePath = _getRemoteSavePath()
            fs.writeFileSync(remoteSavePath, body)
            log.info('保存远程配置文件成功:', remoteSavePath)
          } else {
            log.warn('远程配置对象为空:', remoteConfigUrl)
          }

          resolve()
        } else {
          log.error('下载远程配置失败, response:', response, ', body:', body)

          let message
          if (response) {
            message = '下载远程配置失败: ' + response.message + ', code: ' + response.statusCode
          } else {
            message = '下载远程配置失败: response: ' + response
          }
          reject(new Error(message))
        }
      })
    })
  },
  readRemoteConfig () {
    if (get().app.remoteConfig.enabled !== true) {
      return {}
    }
    const path = _getRemoteSavePath()
    try {
      if (fs.existsSync(path)) {
        const file = fs.readFileSync(path)
        log.info('读取远程配置文件成功:', path)
        return jsonApi.parse(file.toString())
      } else {
        log.warn('远程配置文件不存在:', path)
      }
    } catch (e) {
      log.error('读取远程配置文件失败:', path, ', error:', e)
    }

    return {}
  },
  readRemoteConfigStr () {
    if (get().app.remoteConfig.enabled !== true) {
      return '{}'
    }
    try {
      const path = _getRemoteSavePath()
      if (fs.existsSync(path)) {
        const file = fs.readFileSync(path)
        log.info('读取远程配置文件内容成功:', path)
        return file.toString()
      } else {
        log.warn('远程配置文件不存在:', path)
      }
    } catch (e) {
      log.error('读取远程配置文件内容失败:', e)
    }

    return '{}'
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

    // 计算新配置与默认配置（启用远程配置时，含远程配置）的差异，并保存到 config.json 中
    const diffConfig = mergeApi.doDiff(defConfig, newConfig)
    const configPath = _getConfigPath()
    fs.writeFileSync(configPath, jsonApi.stringify(diffConfig))
    log.info('保存 config.json 自定义配置文件成功:', configPath)

    // 重载配置
    const allConfig = configApi.set(diffConfig)

    return {
      diffConfig,
      allConfig
    }
  },
  doMerge: mergeApi.doMerge,
  doDiff: mergeApi.doDiff,
  /**
   * 读取 config.json 后，合并配置
   * @returns {*}
   */
  reload () {
    const configPath = _getConfigPath()
    let userConfig
    if (!fs.existsSync(configPath)) {
      userConfig = {}
      log.info('config.json 文件不存在:', configPath)
    } else {
      const file = fs.readFileSync(configPath)
      log.info('读取 config.json 成功:', configPath)
      const fileStr = file.toString()
      userConfig = fileStr && fileStr.length > 2 ? jsonApi.parse(fileStr) : {}
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
      log.warn('newConfig 为空，不做任何操作')
      return configTarget
    }
    return configApi.load(newConfig)
  },
  load (newConfig) {
    const remoteConfig = configApi.readRemoteConfig()

    // 以用户配置作为基准配置，是为了保证用户配置的顺序在前
    const merged = newConfig != null ? lodash.cloneDeep(newConfig) : {}
    // 先合并一次远程配置是为了让远程配置排序在默认配置之前，用户配置之后
    if (remoteConfig != null) {
      mergeApi.doMerge(merged, remoteConfig)
    }

    mergeApi.doMerge(merged, defConfig) // 合并默认配置
    mergeApi.doMerge(merged, remoteConfig) // 合并远程配置
    if (newConfig != null) {
      mergeApi.doMerge(merged, newConfig) // 再合并一次用户配置，使用户配置重新生效
    }
    mergeApi.deleteNullItems(merged) // 删除为null及[delete]的项
    configTarget = merged
    log.info('加载及合并远程配置完成')

    return configTarget
  },
  getDefault () {
    return lodash.cloneDeep(defConfig)
  },
  addDefault (key, defValue) {
    lodash.set(defConfig, key, defValue)
  },
  // 移除用户配置，用于恢复出厂设置功能
  async removeUserConfig () {
    const configPath = _getConfigPath()
    if (fs.existsSync(configPath)) {
      // 读取 config.json 文件内容
      const fileStr = fs.readFileSync(configPath).toString().replace(/\s/g, '')

      // 判断文件内容是否为空或空配置
      if (fileStr === '' || fileStr === '{}') {
        fs.rmSync(configPath)
        return false // config.json 内容为空，或为空json
      }

      // 备份用户自定义配置文件
      fs.renameSync(configPath, configPath + '.bak' + new Date().getTime() + '.json')

      // 重新加载配置
      configApi.load(null)

      return true // 删除并重新加载配置成功
    } else {
      return false // config.json 文件不存在或内容为配置
    }
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
