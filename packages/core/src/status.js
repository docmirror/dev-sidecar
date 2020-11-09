const event = require('./event')
const lodash = require('lodash')
const status = {
  server: { enabled: false },
  proxy: {},
  plugin: {}
}

event.register('status', (event) => {
  lodash.set(status, event.key, event.value)
  console.log('status changed:', event)
}, -999)

module.exports = status
