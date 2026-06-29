const defaultDns = require('node:dns')
const net = require('node:net')
const log = require('../../../utils/util.log.server')
const speedTest = require('../../speed')

// HTTP/2 头值只允许 ASCII 可见字符，需过滤中文等非 ASCII 字符
function safeHeaderValue (value) {
  return String(value).replace(/[^\x20-\x7E]/g, '')
}

function isValidIpAddress (ip) {
  return typeof ip === 'string' && net.isIP(ip) !== 0
}

function getAddressFamily (ip) {
  return net.isIP(ip) === 6 ? 6 : 4
}

function respondLookup (callback, ip, family, all) {
  if (all) {
    callback(null, [{ address: ip, family }])
    return
  }

  callback(null, ip, family)
}

function createIpChecker (tester) {
  if (!tester || tester.backupList == null || tester.backupList.length === 0) {
    return null
  }

  return (ip) => {
    for (let i = 0; i < tester.backupList.length; i++) {
      const item = tester.backupList[i]
      if (item.host === ip) {
        if (item.time > 0) {
          return true // IP测速成功
        }
        if (item.status === 'failed') {
          return false // IP测速失败
        }
        break
      }
    }

    return true // IP测速未知
  }
}

module.exports = {
  createLookupFunc (res, dnsAndFamily, action, target, port, isDnsIntercept) {
    target = target ? (`, target: ${target}`) : ''

    const dns = dnsAndFamily.dns
    const family = Number.parseInt(dnsAndFamily.family) === 6 ? 6 : 4

    return (hostname, options, callback) => {
      const all = options && options.all === true
      const tester = speedTest.getSpeedTester(hostname, port)
      if (tester) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj && isValidIpAddress(aliveIpObj.host)) {
          const addressFamily = getAddressFamily(aliveIpObj.host)
          log.info(`----- ${action}: ${hostname}, use alive ip from dns '${aliveIpObj.dns}': ${aliveIpObj.host}${target} -----`)
          if (res) {
            const dnsLabel = aliveIpObj.dns === '预设IP' ? 'PreSet' : safeHeaderValue(aliveIpObj.dns)
            res.setHeader('DS-DNS-Lookup', `IpTester: ${aliveIpObj.host} ${dnsLabel}`)
          }
          respondLookup(callback, aliveIpObj.host, addressFamily, all)
          return
        } else {
          log.info(`----- ${action}: ${hostname}, no valid alive ip${target}, tester: { "ready": ${tester.ready}, "backupList": ${JSON.stringify(tester.backupList)} }`)
        }
      }

      const ipChecker = createIpChecker(tester)

      dns.lookup(hostname, { ipChecker, family }).then((ip) => {
        if (ip !== hostname && isValidIpAddress(ip)) {
          const addressFamily = getAddressFamily(ip)
          if (isDnsIntercept) {
            isDnsIntercept.dns = dns
            isDnsIntercept.hostname = hostname
            isDnsIntercept.ip = ip
          }
          log.info(`----- ${action}: ${hostname}, use ip from dns '${dns.dnsName}': ${ip}(family: ${addressFamily})${target} -----`)
          if (res) {
            const dnsLabel = dns.dnsName === '预设IP' ? 'PreSet' : safeHeaderValue(dns.dnsName)
            res.setHeader('DS-DNS-Lookup', `DNS: ${ip} (IPv${addressFamily}) ${dnsLabel}`)
          }
          respondLookup(callback, ip, addressFamily, all)
        } else {
          // 使用默认dns
          if (ip != null && ip !== hostname && !isValidIpAddress(ip)) {
            log.warn(`----- ${action}: ${hostname}, dns returned invalid ip '${ip}'${target}, fallback to default DNS`)
          }
          log.info(`----- ${action}: ${hostname}, use default DNS: ${hostname}${target}, options:`, options, ', dns:', dns)
          defaultDns.lookup(hostname, options, callback)
        }
      }).catch((err) => {
        log.error(`----- ${action}: ${hostname}, dns lookup error${target}, options:`, options, `, error:`, err)
        defaultDns.lookup(hostname, options, callback)
      })
    }
  },
}
