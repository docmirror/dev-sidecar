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

function _getRemoteSavePath (suffix = '') {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return path.join(dir, `/remote_config${suffix}.json5`)
}

function _getConfigPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  } else {
    // 兼容1.7.3及以下版本的配置文件处理逻辑
    const newFilePath = path.join(dir, '/config.json')
    const oldFilePath = path.join(dir, '/config.json5')
    if (!fs.existsSync(newFilePath) && fs.existsSync(oldFilePath)) {
      return oldFilePath // 如果新文件不存在，且旧文件存在，则返回旧文件路径
    }
    return newFilePath
  }
  return path.join(dir, '/config.json')
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
  async downloadRemoteConfig () {
    if (get().app.remoteConfig.enabled !== true) {
      // 删除保存的远程配置文件
      configApi.deleteRemoteConfigFile()
      configApi.deleteRemoteConfigFile('_personal')
      return
    }

    const remoteConfig = get().app.remoteConfig
    await configApi.doDownloadCommonRemoteConfig(remoteConfig.url)
    await configApi.doDownloadCommonRemoteConfig(remoteConfig.personalUrl, '_personal')
  },
  doDownloadCommonRemoteConfig (remoteConfigUrl, suffix = '') {
    if (get().app.remoteConfig.enabled !== true) {
      return
    }
    if (!remoteConfigUrl) {
      // 删除保存的远程配置文件
      configApi.deleteRemoteConfigFile(suffix)
      return
    }
    // eslint-disable-next-line handle-callback-err
    return new Promise((resolve, reject) => {
      log.info('开始下载远程配置:', remoteConfigUrl)

      const headers = {
        'Cache-Control': 'no-cache', // 禁止使用缓存
        Pragma: 'no-cache' // 禁止使用缓存
      }
      if (remoteConfigUrl.startsWith('https://raw.githubusercontent.com/')) {
        headers['Server-Name'] = 'baidu.com'
      }
      request(remoteConfigUrl, { headers }, (error, response, body) => {
        if (error) {
          log.error(`下载远程配置失败: ${remoteConfigUrl}, error:`, error, ', response:', response, ', body:', body)
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
            const remoteSavePath = _getRemoteSavePath(suffix)
            fs.writeFileSync(remoteSavePath, body)
            log.info('保存远程配置文件成功:', remoteSavePath)
          } else {
            log.warn('远程配置对象为空:', remoteConfigUrl)
          }

          resolve()
        } else {
          log.error(`下载远程配置失败: ${remoteConfigUrl}, response:`, response, ', body:', body)

          let message
          if (response) {
            message = `下载远程配置失败: ${remoteConfigUrl}, message: ${response.message}, code: ${response.statusCode}`
          } else {
            message = '下载远程配置失败: response: ' + response
          }
          reject(new Error(message))
        }
      })
    })
  },
  deleteRemoteConfigFile (suffix = '') {
    const remoteSavePath = _getRemoteSavePath(suffix)
    if (fs.existsSync(remoteSavePath)) {
      fs.unlinkSync(remoteSavePath)
      log.info('删除远程配置文件成功:', remoteSavePath)
    }
  },
  readRemoteConfig (suffix = '') {
    return jsonApi.parse(configApi.readRemoteConfigStr(suffix))
  },
  readRemoteConfigStr (suffix = '') {
    if (get().app.remoteConfig.enabled !== true) {
      if (suffix === '_personal') {
        if (!get().app.remoteConfig.personalUrl) {
          return '{}'
        }
      } else if (suffix === '') {
        if (!get().app.remoteConfig.url) {
          return '{}'
        }
      }
      return '{}'
    }
    try {
      const path = _getRemoteSavePath(suffix)
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
      if (get().app.remoteConfig.url) {
        defConfig = mergeApi.doMerge(defConfig, configApi.readRemoteConfig())
      }
      if (get().app.remoteConfig.personalUrl) {
        defConfig = mergeApi.doMerge(defConfig, configApi.readRemoteConfig('_personal'))
      }
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
    // 以用户配置作为基准配置，是为了保证用户配置的顺序在前
    const merged = newConfig != null ? lodash.cloneDeep(newConfig) : {}

    if (get().app.remoteConfig.enabled === true) {
      let personalRemoteConfig = null
      let shareRemoteConfig = null

      if (get().app.remoteConfig.personalUrl) {
        personalRemoteConfig = configApi.readRemoteConfig('_personal')
        mergeApi.doMerge(merged, personalRemoteConfig) // 先合并一次个人远程配置，使配置顺序在前
      }
      if (get().app.remoteConfig.url) {
        shareRemoteConfig = configApi.readRemoteConfig()
        mergeApi.doMerge(merged, shareRemoteConfig) // 先合并一次共享远程配置，使配置顺序在前
      }
      mergeApi.doMerge(merged, defConfig) // 合并默认配置，顺序排在最后
      if (get().app.remoteConfig.url) {
        mergeApi.doMerge(merged, shareRemoteConfig) // 再合并一次共享远程配置，使配置生效
      }
      if (get().app.remoteConfig.personalUrl) {
        mergeApi.doMerge(merged, personalRemoteConfig) // 再合并一次个人远程配置，使配置生效
      }
    } else {
      mergeApi.doMerge(merged, defConfig) // 合并默认配置
    }
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
      const fileOriginalStr = fs.readFileSync(configPath).toString()

      // 判断文件内容是否为空或空配置
      const fileStr = fileOriginalStr.replace(/\s/g, '')
      if (fileStr.length < 5) {
        fs.writeFileSync(configPath, '{}')
        return false // config.json 内容为空，或为空json
      }

      // 备份用户自定义配置文件
      fs.writeFileSync(`${configPath}.${Date.now()}.bak.json`, fileOriginalStr)
      // 原配置文件内容设为空
      fs.writeFileSync(configPath, '{}')

      // 重新加载配置
      configApi.load(null)

      return true // 删除并重新加载配置成功
    } else {
      return false // config.json 文件不存在
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
