import fs from 'node:fs';
import jsonApi from '@docmirror/mitmproxy/src/json.js';
import lodash from 'lodash';
import request from 'request';
import defConfig from './config/index.js';
import mergeApi from './merge.js';
import Shell from './shell.js';
import log from './utils/util.log.core.js';
import configLoader from './config/local-config-loader.js';

let configTarget = lodash.cloneDeep(defConfig)

function get () {
  return configTarget
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
    await configApi.doDownloadRemoteConfig(remoteConfig.url)
    await configApi.doDownloadRemoteConfig(remoteConfig.personalUrl, '_personal')
  },
  doDownloadRemoteConfig (remoteConfigUrl, suffix = '') {
    if (!remoteConfigUrl) {
      // 删除保存的远程配置文件
      configApi.deleteRemoteConfigFile(suffix)
      return
    }

    return new Promise((resolve, reject) => {
      log.info('开始下载远程配置:', remoteConfigUrl)

      const headers = {
        'Cache-Control': 'no-cache', // 禁止使用缓存
        'Pragma': 'no-cache', // 禁止使用缓存
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
          } catch {
            log.error(`远程配置内容格式不正确, url: ${remoteConfigUrl}, body: ${body}`)
            remoteConfig = null
          }

          if (remoteConfig != null) {
            const remoteSavePath = configLoader.getRemoteConfigPath(suffix)
            try {
              fs.writeFileSync(remoteSavePath, body)
              log.info('保存远程配置文件成功:', remoteSavePath)
            } catch (e) {
              log.error('保存远程配置文件失败:', remoteSavePath, ', error:', e)
              reject(new Error(`保存远程配置文件失败: ${e.message}`))
              return
            }
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
            message = `下载远程配置失败: response: ${response}`
          }
          reject(new Error(message))
        }
      })
    })
  },
  deleteRemoteConfigFile (suffix = '') {
    const remoteSavePath = configLoader.getRemoteConfigPath(suffix)
    if (fs.existsSync(remoteSavePath)) {
      fs.unlinkSync(remoteSavePath)
      log.info('删除远程配置文件成功:', remoteSavePath)
    }
  },
  readRemoteConfigStr (suffix = '') {
    try {
      const path = configLoader.getRemoteConfigPath(suffix)
      if (fs.existsSync(path)) {
        const file = fs.readFileSync(path)
        log.info('读取远程配置文件内容成功:', path)
        return file.toString()
      } else {
        log.info('远程配置文件不存在:', path)
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
    const defConfig = configApi.cloneDefault()

    // 如果开启了远程配置，则读取远程配置，合并到默认配置中
    if (get().app.remoteConfig.enabled === true) {
      if (get().app.remoteConfig.url) {
        mergeApi.doMerge(defConfig, configLoader.getRemoteConfig())
      }
      if (get().app.remoteConfig.personalUrl) {
        mergeApi.doMerge(defConfig, configLoader.getRemoteConfig('_personal'))
      }
    }

    // 计算新配置与默认配置（启用远程配置时，含远程配置）的差异
    const diffConfig = mergeApi.doDiff(defConfig, newConfig)

    // 将差异作为用户配置保存到 config.json 中
    const configPath = configLoader.getUserConfigPath()
    try {
      fs.writeFileSync(configPath, jsonApi.stringify(diffConfig))
      log.info('保存 config.json 自定义配置文件成功:', configPath)
    } catch (e) {
      log.error('保存 config.json 自定义配置文件失败:', configPath, ', error:', e)
      throw e
    }

    // 重载配置
    const allConfig = configApi.set(diffConfig)

    return {
      diffConfig,
      allConfig,
    }
  },
  doMerge: mergeApi.doMerge,
  doDiff: mergeApi.doDiff,
  /**
   * 读取 config.json 后，合并配置
   */
  reload () {
    const userConfig = configLoader.getUserConfig()
    return configApi.set(userConfig) || {}
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
    const config = configLoader.getConfigFromFiles(newConfig, defConfig)
    configTarget = config
    return config
  },
  cloneDefault () {
    return lodash.cloneDeep(defConfig)
  },
  addDefault (key, defValue) {
    lodash.set(defConfig, key, defValue)
  },
  // 移除用户配置，用于恢复出厂设置功能
  async removeUserConfig () {
    const configPath = configLoader.getUserConfigPath()
    if (fs.existsSync(configPath)) {
      // 读取 config.json 文件内容
      const fileOriginalStr = fs.readFileSync(configPath).toString()

      // 判断文件内容是否为空或空配置
      const fileStr = fileOriginalStr.replace(/\s/g, '')
      if (fileStr.length < 5) {
        try {
          fs.writeFileSync(configPath, '{}')
        } catch (e) {
          log.warn('简化用户配置文件失败:', configPath, ', error:', e)
        }
        return false // config.json 内容为空，或为空json
      }

      // 备份用户自定义配置文件
      const bakConfigPath = `${configPath}.${Date.now()}.bak.json`
      try {
        fs.writeFileSync(bakConfigPath, fileOriginalStr)
        log.info('备份用户配置文件成功:', bakConfigPath)
      } catch (e) {
        log.error('备份用户配置文件失败:', bakConfigPath, ', error:', e)
        throw e
      }
      // 原配置文件内容设为空
      try {
        fs.writeFileSync(configPath, '{}')
      } catch (e) {
        log.error('初始化用户配置文件失败:', configPath, ', error:', e)
        throw e
      }

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
        exists,
      })
    }
    return list
  },
  async setVariables (type) {
    const list = await configApi.getVariables(type)
    const noSetList = list.filter((item) => {
      return !item.exists
    })
    if (list.length > 0) {
      const context = {
        root_ca_cert_path: configApi.get().server.setting.rootCaFile.certPath,
      }
      for (const item of noSetList) {
        if (item.value.includes('${')) {
          for (const key in context) {
            item.value = item.value.replcace(new RegExp(`\${${key}}`, 'g'), context[key])
          }
        }
      }
      const method = type === 'npm' ? Shell.setNpmEnv : Shell.setSystemEnv
      return method({ list: noSetList })
    }
  },
}

export default configApi;
