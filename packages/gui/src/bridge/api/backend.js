import lodash from 'lodash'
import DevSidecar from '@docmirror/dev-sidecar'
import { ipcMain } from 'electron'
import fs from 'fs'
import JSON5 from 'json5'
import path from 'path'
const pk = require('../../../package.json')
const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')
process.env.DS_SYSPROXY_PATH = path.join(__dirname, '../extra/sysproxy.exe')
const log = require('../../utils/util.log')
const getDefaultConfigBasePath = function () {
  return DevSidecar.api.config.get().server.setting.userBasePath
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
    }
  },
  /**
   * 软件设置
   */
  setting: {
    load () {
      const settingPath = _getSettingsPath()
      if (!fs.existsSync(settingPath)) {
        this.save({})
      }
      const file = fs.readFileSync(settingPath)
      const setting = JSON5.parse(file.toString())
      if (setting && setting.installTime == null) {
        setting.installTime = new Date().getTime()
        this.save(setting)
      }
      if (setting && setting.overwall == null) {
        setting.overwall = true
        this.save(setting)
      }
      return setting || {}
    },
    save (setting = {}) {
      const settingPath = _getSettingsPath()
      fs.writeFileSync(settingPath, JSON5.stringify(setting, null, 2))
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
  },
  config: {
    /**
     * 保存自定义的 config
     * @param newConfig
     */
    save (newConfig) {
      // 对比默认config的异同
      DevSidecar.api.config.set(newConfig)
      const defConfig = DevSidecar.api.config.getDefault()
      const saveConfig = doMerge(defConfig, newConfig)
      fs.writeFileSync(_getConfigPath(), JSON5.stringify(saveConfig, null, 2))
      return saveConfig
    },
    /**
     * 读取后合并配置
     * @returns {*}
     */
    reload () {
      const path = _getConfigPath()
      if (!fs.existsSync(path)) {
        return DevSidecar.api.config.get()
      }
      const file = fs.readFileSync(path)
      const userConfig = JSON5.parse(file.toString())
      DevSidecar.api.config.set(userConfig)
      const config = DevSidecar.api.config.get()
      return config || {}
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
  }
  return dir + '/setting.json5'
}
function _getConfigPath () {
  const dir = getDefaultConfigBasePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir + '/config.json5'
}

function doMerge (defObj, newObj) {
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
      log.info('bridge on status', event)
      win.webContents.send('status', { ...event })
    })
    DevSidecar.api.event.register('error', (event) => {
      log.error('bridge on error', event)
      win.webContents.send('error.core', event)
    })

    // 合并用户配置
    localApi.config.reload()
    // 启动所有
    localApi.startup()
  },
  devSidecar: DevSidecar,
  invoke
}
