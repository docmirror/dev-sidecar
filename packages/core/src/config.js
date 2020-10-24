const lodash = require('lodash')
const defConfig = require('./config/index.js')
let configTarget = defConfig
module.exports = {
  get () {
    return configTarget
  },
  set (newConfig) {
    const clone = lodash.cloneDeep(defConfig)
    lodash.merge(clone, newConfig)
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
