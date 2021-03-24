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

function getAllSpeedTester () {
  const allSpeed = {}
  _.forEach(SpeedTestPool, (item, key) => {
    allSpeed[key] = {
      hostname: key,
      alive: item.alive,
      backupList: item.backupList
    }
  })
  return allSpeed
}

function getSpeedTester (hostname) {
  let instance = SpeedTestPool[hostname]
  if (instance == null) {
    instance = new SpeedTester({ hostname })
    SpeedTestPool[hostname] = instance
  }
  return instance
}

function registerNotify (notify) {
  config.notify = notify
}

function reSpeedTest () {
  _.forEach(SpeedTestPool, (item, key) => {
    item.test()
  })
}

// action调用
function action (event) {
  if (event.key === 'reTest') {
    reSpeedTest()
  } else if (event.key === 'getList') {
    process.send({ type: 'speed', event: { key: 'getList', value: getAllSpeedTester() } })
  }
}
module.exports = {
  SpeedTester,
  initSpeedTestPool,
  getSpeedTester,
  getAllSpeedTester,
  registerNotify,
  reSpeedTest,
  action
}
