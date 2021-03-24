const SpeedTester = require('./SpeedTester.js')
const _ = require('lodash')
const config = require('./config')

const SpeedTestPool = {

}
function initSpeedTestPool ({ hostnameList, dnsMap }) {
  config.getConfig().dnsMap = dnsMap
  _.forEach(hostnameList, (hostname) => {
    SpeedTestPool[hostname] = new SpeedTester({ hostname })
  })

  console.log('[speed] dnsMap', dnsMap)
}

module.exports = {
  SpeedTester,
  initSpeedTestPool,
  getSpeedTester (hostname) {
    let instance = SpeedTestPool[hostname]
    if (instance == null) {
      instance = new SpeedTester({ hostname })
      SpeedTestPool[hostname] = instance
    }
    return instance
  }
}
