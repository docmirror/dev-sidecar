import DevSidecar from '@docmirror/dev-sidecar'
import { ipcMain } from 'electron'
import lodash from 'lodash'
import { getDateTimeStr, getDefaultConfigBasePath, getLogDir, loadConfig, mitmproxyPath, saveConfig } from '../../background/config'

const pk = require('../../../package.json')
const log = require('../../utils/util.log')

const localApi = {
  /**
   * 返回所有api列表，供vue来ipc调用
   * @returns {[]} api列表
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
        version: pk.version,
      }
    },
    getConfigDir () {
      return getDefaultConfigBasePath()
    },
    getLogDir () {
      return getLogDir()
    },
    getSystemPlatform (throwIfUnknown = false) {
      return DevSidecar.api.shell.getSystemPlatform(throwIfUnknown)
    },
  },
  /**
   * 软件设置
   */
  setting: {
    load () {
      return loadConfig()
    },
    save (setting = {}) {
      saveConfig(setting)
    },
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
    },
  },
}

function _deepFindFunction (list, parent, parentKey) {
  for (const key in parent) {
    const item = parent[key]
    if (item instanceof Function) {
      list.push(parentKey + key)
    } else if (item instanceof Object) {
      _deepFindFunction(list, item, `${parentKey + key}.`)
    }
  }
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
      if (win) {
        win.webContents.send('status', { ...event })
      }
    })
    DevSidecar.api.event.register('error', (event) => {
      log.error('bridge on error, event:', event)
      if (win) {
        win.webContents.send('error.core', event)
      }
    })
    DevSidecar.api.event.register('speed', (event) => {
      if (win) {
        win.webContents.send('speed', event)
      }
    })

    // 合并用户配置
    DevSidecar.api.config.reload()
    doStart()
  },
  devSidecar: DevSidecar,
  invoke,
  getDateTimeStr,
}
