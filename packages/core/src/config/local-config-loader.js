import fs from 'node:fs'
import path from 'node:path'
import lodash from 'lodash'
import jsonApi from '@docmirror/mitmproxy/src/json.js'
import mergeApi from '../merge.js'
import logOrConsole from '../utils/util.log-or-console.js'

function getUserBasePath (autoCreate = true) {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  const dir = path.resolve(userHome, './.dev-sidecar')

  // 自动创建目录
  if (autoCreate && !fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  return dir
}

function loadConfigFromFile (configFilePath) {
  if (configFilePath == null) {
    logOrConsole.error('配置文件地址为空')
    return {}
  }

  if (!fs.existsSync(configFilePath)) {
    logOrConsole.info('配置文件不存在:', configFilePath)
    return {} // 文件不存在，返回空配置
  }

  // 读取配置文件
  let configStr
  try {
    configStr = fs.readFileSync(configFilePath)
  } catch (e) {
    logOrConsole.error('读取配置文件失败:', configFilePath, ', error:', e)
    return {}
  }

  // 解析配置文件
  try {
    const config = jsonApi.parse(configStr)
    logOrConsole.info('读取配置文件成功:', configFilePath)
    return config
  } catch (e) {
    logOrConsole.error(`解析配置文件失败，文件内容格式不正确，文件路径: ${configFilePath}，文件内容：${configStr}，error:`, e)
    return {}
  }
}

function getUserConfigPath () {
  const dir = getUserBasePath()

  // 兼容1.7.3及以下版本的配置文件处理逻辑
  const newFilePath = path.join(dir, '/config.json')
  const oldFilePath = path.join(dir, '/config.json5')
  if (!fs.existsSync(newFilePath) && fs.existsSync(oldFilePath)) {
    return oldFilePath // 如果新文件不存在，但旧文件存在，则返回旧文件路径
  }

  return newFilePath
}

function getUserConfig () {
  const configFilePath = getUserConfigPath()
  return loadConfigFromFile(configFilePath)
}

function getRemoteConfigPath (suffix = '') {
  const dir = getUserBasePath()
  return path.join(dir, `/remote_config${suffix}.json5`)
}

function getRemoteConfig (suffix = '') {
  const remoteConfigFilePath = getRemoteConfigPath(suffix)
  return loadConfigFromFile(remoteConfigFilePath)
}

function getAutomaticCompatibleConfigPath () {
  const dir = getUserBasePath()
  return path.join(dir, '/automaticCompatibleConfig.json')
}

/**
 * 从文件读取配置
 *
 * @param userConfig 用户配置
 * @param defaultConfig 默认配置
 */
function getConfigFromFiles (userConfig, defaultConfig) {
  const merged = userConfig != null ? lodash.cloneDeep(userConfig) : {}

  const personalRemoteConfig = getRemoteConfig('_personal')
  const shareRemoteConfig = getRemoteConfig()

  mergeApi.doMerge(merged, personalRemoteConfig) // 先合并一次个人远程配置，使配置顺序在前
  mergeApi.doMerge(merged, shareRemoteConfig) // 先合并一次共享远程配置，使配置顺序在前
  mergeApi.doMerge(merged, defaultConfig) // 合并默认配置，顺序排在最后
  mergeApi.doMerge(merged, shareRemoteConfig) // 再合并一次共享远程配置，使配置生效
  mergeApi.doMerge(merged, personalRemoteConfig) // 再合并一次个人远程配置，使配置生效

  if (userConfig != null) {
    mergeApi.doMerge(merged, userConfig) // 再合并一次用户配置，使用户配置重新生效
  }

  // 删除为null及[delete]的项
  mergeApi.deleteNullItems(merged)

  logOrConsole.info('加载及合并远程配置完成')
  return merged
}

export default {
  getUserBasePath,

  loadConfigFromFile,

  getUserConfigPath,
  getUserConfig,

  getRemoteConfigPath,
  getRemoteConfig,

  getAutomaticCompatibleConfigPath,

  getConfigFromFiles,
}
