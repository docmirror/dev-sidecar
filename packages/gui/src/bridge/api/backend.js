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
        setting = JSON5.parse(file.toString())
        if (setting == null) {
          setting = {}
        }
      }
      if (setting.overwall == null) {
        setting.overwall = false
      }

      if (setting.installTime == null) {
        setting.installTime = new Date().getTime()
        localApi.setting.save(setting)
      }
      return setting
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
    DevSidecar.api.event.register('speed', (event) => {
      win.webContents.send('speed', event)
    })

    // 合并用户配置
    DevSidecar.api.config.reload()
    // 启动所有
    localApi.startup()
  },
  devSidecar: DevSidecar,
  invoke
}
