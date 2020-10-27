const Shell = require('./shell')
const lodash = require('lodash')
const defConfig = require('./config/index.js')
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
  resetDefault () {
    configTarget = lodash.cloneDeep(defConfig)
  },
  getMirrorEnv () {
    const envMap = Shell.getEnv()
    const list = []
    const mirrors = configTarget.mirrors
    for (const key in mirrors) {
      const exists = envMap[key] != null
      list.push({
        key,
        value: mirrors[key],
        exists
      })
    }
    console.log('mirrors:', list)
    return list
  },
  setupMirrors () {
    const list = configApi.getMirrorEnv()
    const noSetList = list.filter(item => {
      return !item.exists
    })
    console.log('mirrors will set:', noSetList)
    if (list.length > 0) {
      Shell.setEnv({ list: noSetList })
    }
  }
}

module.exports = configApi
