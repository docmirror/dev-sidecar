import lodash from 'lodash'
import DevSidecar from 'dev-sidecar'
import { ipcMain } from 'electron'
import fs from 'fs'
import JSON5 from 'json5'

const localApi = {
  config: {
    /**
     * 保存自定义的 config
     * @param newConfig
     */
    save (newConfig) {
      // 对比默认config的异同
      const defConfig = DevSidecar.api.config.get()

      const saveConfig = {}

      _merge(defConfig, newConfig, saveConfig, 'intercepts')
      _merge(defConfig, newConfig, saveConfig, 'dns.mapping')
      _merge(defConfig, newConfig, saveConfig, 'setting.startup.server', true)
      _merge(defConfig, newConfig, saveConfig, 'setting.startup.proxy')

      // TODO 保存到文件
      console.log('save config ', saveConfig)
      fs.writeFileSync('./config.json5', JSON5.stringify(saveConfig, null, 2))
      return saveConfig
    },
    reload () {
      const file = fs.readFileSync('./config.json5')
      const userConfig = JSON5.parse(file.toString())
      DevSidecar.api.config.set(userConfig)
    }
  }
}

function _merge (defConfig, newConfig, saveConfig, target, self = false) {
  if (self) {
    const defValue = lodash.get(defConfig, target)
    const newValue = lodash.get(newConfig, target)
    if (newValue != null && newValue !== defValue) {
      lodash.set(saveConfig, newValue, target)
    }
    return
  }
  const saveObj = _mergeConfig(lodash.get(defConfig, target), lodash.get(newConfig, target))
  lodash.set(saveConfig, target, saveObj)
}

function _mergeConfig (defObj, newObj) {
  for (const key in defObj) {
    // 从默认里面提取对比，是否有被删除掉的
    if (newObj[key] == null) {
      newObj[key] = false
    }
  }
  for (const key in newObj) {
    const newItem = newObj[key]
    const defItem = defObj[key]
    if (newItem && !defItem) {
      continue
    }
    // 深度对比 是否有修改
    if (lodash.isEqual(newItem, defItem)) {
      console.log('equle', key, newItem, defItem)
      // 没有修改则删除
      delete newObj[key]
    }
  }
  return newObj
}

export default {
  init (win) {
    // 接收view的方法调用
    ipcMain.handle('apiInvoke', async (event, args) => {
      const api = args[0]
      let target = lodash.get(DevSidecar.api, api)
      if (target == null) {
        console.log('get local api')
        target = lodash.get(localApi, api)
      }
      if (target == null) {
        console.log('找不到此接口方法：', api)
      }
      let param
      if (args.length >= 2) {
        param = args[1]
      }
      const ret = target(param)
      console.log('api:', api, 'ret:', ret)
      return ret
    })
    // 注册从core里来的事件，并转发给view
    DevSidecar.api.event.register('status', (event) => {
      console.log('bridge on status', event)
      win.webContents.send('status', { ...event })
    })
  },
  devSidecar: DevSidecar
}
