const _ = require('lodash')
const log = require('../../utils/util.log.server')
const config = require('./config')
const cloudflareRoute = require('../cloudflareRoute')
const SpeedTester = require('./SpeedTester.js')

const SpeedTestPool = {
}

function addSpeedTest (hostname, port) {
  if (!port) {
    const idx = hostname.indexOf(':')
    if (idx > 0 && idx === hostname.lastIndexOf(':')) {
      const arr = hostname.split(':')
      hostname = arr[0]
      port = Number.parseInt(arr[1]) || 443
    } else {
      port = 443
    }
  }

  // 443端口不拼接在key上
  const key = port === 443 ? hostname : `${hostname}:${port}`

  if (SpeedTestPool[key] == null) {
    return SpeedTestPool[key] = new SpeedTester({ hostname, port })
  }

  return SpeedTestPool[key]
}

function initSpeedTest (runtimeConfig) {
  const { enabled, hostnameList, dnsConfig } = runtimeConfig
  const conf = config.getConfig()
  _.merge(conf, runtimeConfig)
  // 保存完整的 dnsConfig，供 SpeedTester 按域名动态选择 DNS
  conf.dnsConfig = dnsConfig
  if (!enabled) {
    return
  }
  _.forEach(hostnameList, (hostname) => {
    addSpeedTest(hostname)
  })
  // Cloudflare 路由数据就绪后重新测速一次，避免首次测速时 CF 段尚未拉取导致未重写
  cloudflareRoute.setReadyListener(() => {
    log.info('[speed] Cloudflare 路由数据已就绪，重新测速一次')
    reSpeedTest()
  })
  log.info('[speed] enabled，SpeedTestPool:', SpeedTestPool)
}

function getAllSpeedTester () {
  const allSpeed = {}

  if (config.getConfig().enabled) {
    _.forEach(SpeedTestPool, (item, key) => {
      allSpeed[key] = {
        hostname: item.hostname,
        port: item.port,
        alive: item.alive,
        backupList: item.backupList,
      }
    })
  }

  return allSpeed
}

function getSpeedTester (hostname, port) {
  if (!config.getConfig().enabled) {
    return null
  }
  return addSpeedTest(hostname, port)
}

// function registerNotify (notify) {
//   config.notify = notify
// }

function reSpeedTest () {
  _.forEach(SpeedTestPool, (item, _key) => {
    item.test() // 异步
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
  // getAllSpeedTester,
  // registerNotify,
  reSpeedTest,
  action,
}
