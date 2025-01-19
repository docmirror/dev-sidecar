import path from 'node:path'
import DevSidecar from '@docmirror/dev-sidecar'
import fs from 'node:fs'

const jsonApi = require('@docmirror/mitmproxy/src/json')
const log = require('../utils/util.log')
const configFromFiles = require('@docmirror/dev-sidecar/src/config/index.js').configFromFiles

export const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')
process.env.DS_EXTRA_PATH = path.join(__dirname, '../extra/')

function getDefaultConfigBasePath () {
  return DevSidecar.api.config.get().server.setting.userBasePath
}

export function getSettingsPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  } else {
    // 兼容1.7.3及以下版本的配置文件处理逻辑
    const newFilePath = path.join(dir, '/setting.json')
    const oldFilePath = path.join(dir, '/setting.json5')
    if (!fs.existsSync(newFilePath) && fs.existsSync(oldFilePath)) {
      return oldFilePath // 如果新文件不存在，且旧文件存在，则返回旧文件路径
    }
    return newFilePath
  }
  return path.join(dir, '/setting.json')
}

export function getLogDir () {
  return configFromFiles.app.logFileSavePath || path.join(getDefaultConfigBasePath(), '/logs/')
}

export function loadConfig () {
  const settingPath = getSettingsPath()
  let setting = {}
  if (fs.existsSync(settingPath)) {
    const file = fs.readFileSync(settingPath)
    try {
      setting = jsonApi.parse(file.toString())
      log.info('读取 setting.json 成功:', settingPath)
    } catch (e) {
      log.error('读取 setting.json 失败:', settingPath, ', error:', e)
    }
    if (setting == null) {
      setting = {}
    }
  }
  if (setting.overwall == null) {
    setting.overwall = false
  }

  if (setting.installTime == null) {
    // 设置安装时间
    setting.installTime = getDateTimeStr()

    // 初始化 rootCa.setuped
    if (setting.rootCa == null) {
      setting.rootCa = {
        setuped: false,
        desc: '根证书未安装',
      }
    }

    // 保存 setting.json
    saveConfig(setting)
  }
  return setting
}

export function saveConfig (setting) {
  const settingPath = getSettingsPath()
  fs.writeFileSync(settingPath, jsonApi.stringify(setting))
  log.info('保存 setting.json 配置文件成功:', settingPath)
}

export function getDateTimeStr () {
  const date = new Date() // 创建一个表示当前日期和时间的 Date 对象
  const year = date.getFullYear() // 获取年份
  const month = String(date.getMonth() + 1).padStart(2, '0') // 获取月份（注意月份从 0 开始计数）
  const day = String(date.getDate()).padStart(2, '0') // 获取天数
  const hours = String(date.getHours()).padStart(2, '0') // 获取小时
  const minutes = String(date.getMinutes()).padStart(2, '0') // 获取分钟
  const seconds = String(date.getSeconds()).padStart(2, '0') // 获取秒数
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0') // 获取毫秒
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export function getExtraPath () {
  return path.join(__dirname, '../extra/')
}
