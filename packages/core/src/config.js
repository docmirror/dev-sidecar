const lodash = require('lodash')
const defConfig = require('./config/index.js')
let configTarget = defConfig

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
    const clone = lodash.cloneDeep(defConfig)
    lodash.merge(clone, newConfig)

    _deleteDisabledItem(clone, 'intercepts')
    _deleteDisabledItem(clone, 'dns.mapping')
    configTarget = clone
    return configTarget
  },
  getDefault () {
    return defConfig
  },
  resetDefault () {
    configTarget = defConfig
  }
}
