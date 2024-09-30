import lodash from 'lodash'
import DevSidecar from '@docmirror/dev-sidecar'
import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
const pk = require('../../../package.json')
const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')
process.env.DS_EXTRA_PATH = path.join(__dirname, '../extra/')
const jsonApi = require('@docmirror/mitmproxy/src/json')
const log = require('../../utils/util.log')

const getDefaultConfigBasePath = function () {
  return DevSidecar.api.config.get().server.setting.userBasePath
}

const getDateTimeStr = function () {
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

const localApi = {
  /**
   * 返回所有api列表，供vue来ipc调用
   * @returns {[]}
   */
  getApiList () {
    const core = lodash.cloneDeep(DevSidecar.api)
    const local = lodash.cloneDeep(localApi)
    lodash.merge(core, local)
    const list = []
    _deepFindFunction(list, core, '')
    // log.info('api list:', list)
    return list
  },
  info: {
    get () {
      return {
        version: pk.version
      }
    },
    getConfigDir () {
      return getDefaultConfigBasePath()
    },
    getSystemPlatform () {
      return DevSidecar.api.shell.getSystemPlatform()
    }
  },
  /**
   * 软件设置
   */
  setting: {
    load () {
      const settingPath = _getSettingsPath()
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
            desc: '根证书未安装'
          }
        }

        // 保存 setting.json
        localApi.setting.save(setting)
      }
      return setting
    },
    save (setting = {}) {
      const settingPath = _getSettingsPath()
      fs.writeFileSync(settingPath, jsonApi.stringify(setting))
      log.info('保存 setting.json 配置文件成功:', settingPath)
    }
  },
  /**
   * 启动所有
   * @returns {Promise<void>}
   */
  startup () {
    return DevSidecar.api.startup({ mitmproxyPath })
  },
  server: {
    /**
     * 启动代理服务
     * @returns {Promise<{port: *}>}
     */
    start () {
      return DevSidecar.api.server.start({ mitmproxyPath })
    },
    /**
     * 重启代理服务
     * @returns {Promise<void>}
     */
    restart () {
      return DevSidecar.api.server.restart({ mitmproxyPath })
    }
  }
}

function _deepFindFunction (list, parent, parentKey) {
  for (const key in parent) {
    const item = parent[key]
    if (item instanceof Function) {
      list.push(parentKey + key)
    } else if (item instanceof Object) {
      _deepFindFunction(list, item, parentKey + key + '.')
    }
  }
}

function _getSettingsPath () {
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

function invoke (api, param) {
  let target = lodash.get(localApi, api)
  if (target == null) {
    target = lodash.get(DevSidecar.api, api)
  }
  if (target == null) {
    log.info('找不到此接口方法：', api)
  }
  const ret = target(param)
  // log.info('api:', api, 'ret:', ret)
  return ret
}

async function doStart () {
  // 开启自动下载远程配置
  await DevSidecar.api.config.startAutoDownloadRemoteConfig()
  // 启动所有
  localApi.startup()
}

export default {
  install ({ win }) {
    // 接收view的方法调用
    ipcMain.handle('apiInvoke', async (event, args) => {
      const api = args[0]
      let param
      if (args.length >= 2) {
        param = args[1]
      }
      return invoke(api, param)
    })
    // 注册从core里来的事件，并转发给view
    DevSidecar.api.event.register('status', (event) => {
      log.info('bridge on status, event:', event)
      if (win) win.webContents.send('status', { ...event })
    })
    DevSidecar.api.event.register('error', (event) => {
      log.error('bridge on error, event:', event)
      if (win) win.webContents.send('error.core', event)
    })
    DevSidecar.api.event.register('speed', (event) => {
      if (win) win.webContents.send('speed', event)
    })

    // 合并用户配置
    DevSidecar.api.config.reload()
    doStart()
  },
  devSidecar: DevSidecar,
  invoke,
  getDateTimeStr
}
