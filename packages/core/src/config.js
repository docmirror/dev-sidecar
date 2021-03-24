const fs = require('fs')
const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
const JSON5 = require('json5').default

console.log('JSON5', JSON5)
let configTarget = lodash.cloneDeep(defConfig)

function get () {
  return configTarget
}

function _deleteDisabledItem (target) {
  lodash.forEach(target, (item, key) => {
    if (item == null) {
      delete target[key]
    }
    if (lodash.isObject(item)) {
      _deleteDisabledItem(item)
    }
  })
}
const getDefaultConfigBasePath = function () {
  return get().server.setting.userBasePath
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

const configApi = {
  /**
   * 保存自定义的 config
   * @param newConfig
   */
  save (newConfig) {
    // 对比默认config的异同
    // configApi.set(newConfig)
    const defConfig = configApi.getDefault()
    const saveConfig = doMerge(defConfig, newConfig)
    fs.writeFileSync(_getConfigPath(), JSON5.stringify(saveConfig, null, 2))
    configApi.reload()
    return saveConfig
  },
  doMerge,
  /**
   * 读取后合并配置
   * @returns {*}
   */
  reload () {
    const path = _getConfigPath()
    if (!fs.existsSync(path)) {
      return configApi.get()
    }
    const file = fs.readFileSync(path)
    const userConfig = JSON5.parse(file.toString())
    configApi.set(userConfig)
    const config = configApi.get()
    return config || {}
  },
  get,
  set (newConfig) {
    if (newConfig == null) {
      return
    }
    const merged = lodash.cloneDeep(newConfig)
    const clone = lodash.cloneDeep(defConfig)
    function customizer (objValue, srcValue) {
      if (lodash.isArray(objValue)) {
        return srcValue
      }
    }
    lodash.mergeWith(merged, clone, customizer)
    lodash.mergeWith(merged, newConfig, customizer)
    _deleteDisabledItem(merged)
    configTarget = merged
    return configTarget
  },
  getDefault () {
    return lodash.cloneDeep(defConfig)
  },
  addDefault (key, defValue) {
    lodash.set(defConfig, key, defValue)
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
