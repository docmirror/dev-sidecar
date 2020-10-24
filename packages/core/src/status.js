const event = require('./event')
const lodash = require('lodash')
const status = {
  server: false,
  proxy: {
    system: false,
    npm: false,
    git: false
  }
}

event.register('status', (event) => {
  lodash.set(status, event.key, event.value)
  console.log('status changed:', event)
}, -999)
module.exports = status
