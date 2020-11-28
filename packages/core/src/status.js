const event = require('./event')
const lodash = require('lodash')
const log = require('./utils/util.log')
const status = {
  server: { enabled: false },
  proxy: {},
  plugin: {}
}

event.register('status', (event) => {
  lodash.set(status, event.key, event.value)
  log.info('status changed:', event)
}, -999)

module.exports = status
