import lodash from 'lodash'
import DevSidecar from '@docmirror/dev-sidecar'
import { ipcMain } from 'electron'
import fs from 'fs'
import JSON5 from 'json5'
import path from 'path'
const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')
const localApi = {
  getApiList () {
    const core = lodash.cloneDeep(DevSidecar.api)
    const local = lodash.cloneDeep(localApi)
    lodash.merge(core, local)
    const list = []
    _deepFindFunction(list, core, '')
    console.log('api list:', list)
    return list
  },
  startup () {
    return DevSidecar.api.startup({ mitmproxyPath })
  },
  server: {
    start () {
      return DevSidecar.api.server.start({ mitmproxyPath })
    }
  },
  config: {
    /**
     * 保存自定义的 config
     * @param newConfig
     */
    save (newConfig) {
      // 对比默认config的异同
      const defConfig = DevSidecar.api.config.getDefault()
      const saveConfig = doMerge(defConfig, newConfig)

      // _merge(defConfig, newConfig, saveConfig, 'intercepts')
      // _merge(defConfig, newConfig, saveConfig, 'dns.mapping')
      // _merge(defConfig, newConfig, saveConfig, 'setting.startup.server', true)
      // _merge(defConfig, newConfig, saveConfig, 'setting.startup.proxy')

      fs.writeFileSync(_getConfigPath(), JSON5.stringify(saveConfig, null, 2))
      return saveConfig
    },
    reload () {
      const path = _getConfigPath()
      if (!fs.existsSync(path)) {
        return DevSidecar.api.config.get()
      }
      const file = fs.readFileSync(path)
      const userConfig = JSON5.parse(file.toString())
      DevSidecar.api.config.set(userConfig)
      const config = DevSidecar.api.config.get()
      return config
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

function _getConfigPath () {
  const dir = './config/'
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return dir + 'config.json5'
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

export default {
  init (win) {
    // 接收view的方法调用
    ipcMain.handle('apiInvoke', async (event, args) => {
      const api = args[0]
      let target = lodash.get(localApi, api)
      if (target == null) {
        target = lodash.get(DevSidecar.api, api)
      }
      if (target == null) {
        console.log('找不到此接口方法：', api)
      }
      let param
      if (args.length >= 2) {
        param = args[1]
      }
      const ret = target(param)
      // console.log('api:', api, 'ret:', ret)
      return ret
    })
    // 注册从core里来的事件，并转发给view
    DevSidecar.api.event.register('status', (event) => {
      console.log('bridge on status', event)
      win.webContents.send('status', { ...event })
    })
    DevSidecar.api.event.register('error', (event) => {
      console.error('bridge on error', event)
      win.webContents.send('error.core', event)
    })

    // 合并用户配置
    localApi.config.reload()
    localApi.startup()
  },
  devSidecar: DevSidecar
}
