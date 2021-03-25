const SpeedTester = require('./SpeedTester.js')
const _ = require('lodash')
const config = require('./config')
const log = require('../../utils/util.log.js')
const SpeedTestPool = {

}
function initSpeedTest (runtimeConfig) {
  const { enabled, hostnameList } = runtimeConfig
  const conf = config.getConfig()
  _.merge(conf, runtimeConfig)
  if (!enabled) {
    return
  }
  _.forEach(hostnameList, (hostname) => {
    SpeedTestPool[hostname] = new SpeedTester({ hostname })
  })
  log.info('[speed] enabled')
}

function getAllSpeedTester () {
  const allSpeed = {}
  if (!config.getConfig().enabled) {
    return allSpeed
  }
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
  if (!config.getConfig().enabled) {
    return
  }
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
  initSpeedTest,
  getSpeedTester,
  getAllSpeedTester,
  registerNotify,
  reSpeedTest,
  action
}
