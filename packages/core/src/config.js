const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
const proxyConfig = require('./lib/proxy/common/config')
let configTarget = lodash.cloneDeep(defConfig)
function _deleteDisabledItem (target, objKey) {
  const obj = lodash.get(target, objKey)
  for (const key in obj) {
    if (obj[key] === false) {
      delete obj[key]
    }
  }
}
const configApi = {
  get () {
    return configTarget
  },
  set (newConfig) {
    if (newConfig == null) {
      return
    }
    const merged = lodash.cloneDeep(newConfig)
    const clone = lodash.cloneDeep(defConfig)
    lodash.merge(merged, clone)
    lodash.merge(merged, newConfig)

    _deleteDisabledItem(merged, 'intercepts')
    _deleteDisabledItem(merged, 'dns.mapping')
    configTarget = merged
    return configTarget
  },
  getDefault () {
    return lodash.cloneDeep(defConfig)
  },
  addDefault (key, defValue) {
    lodash.set(defConfig, key, defValue)
  },
  resetDefault () {
    configTarget = lodash.cloneDeep(defConfig)
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
        ca_cert_path: proxyConfig.getDefaultCACertPath()
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
