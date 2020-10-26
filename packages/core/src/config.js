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
module.exports = {
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
  }
}
