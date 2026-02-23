const defaultDns = require('node:dns')
const net = require('node:net')
const log = require('../../../utils/util.log.server')
const speedTest = require('../../speed')

function normalizeIp (ip) {
  if (!ip || typeof ip !== 'string') {
    return ip
  }

  // [IPv6]:port 或 [IPv6]
  if (ip.startsWith('[')) {
    const match = ip.match(/^\[([^\]]+)\](?::(\d+))?$/)
    if (match) {
      return match[1]
    }
  }

  // IPv4:port 或 IPv6:port
  const lastColon = ip.lastIndexOf(':')
  if (lastColon > -1) {
    const maybeHost = ip.slice(0, lastColon)
    const maybePort = ip.slice(lastColon + 1)
    if (/^\d+$/.test(maybePort) && net.isIP(maybeHost)) {
      return maybeHost
    }
  }

  return ip
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
  createLookupFunc (res, dns, action, target, port, isDnsIntercept) {
    target = target ? (`, target: ${target}`) : ''

    return (hostname, options, callback) => {
      const tester = speedTest.getSpeedTester(hostname, port)
      if (tester) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj) {
          const aliveIp = normalizeIp(aliveIpObj.host)
          const family = aliveIp && aliveIp.includes(':') ? 6 : 4
          log.info(`----- ${action}: ${hostname}, use alive ip from dns '${aliveIpObj.dns}': ${aliveIp}${target} -----`)
          if (res) {
            res.setHeader('DS-DNS-Lookup', `IpTester: ${aliveIp} ${aliveIpObj.dns === '预设IP' ? 'PreSet' : aliveIpObj.dns}`)
          }
          callback(null, aliveIp, family)
          return
        } else {
          log.info(`----- ${action}: ${hostname}, no alive ip${target}, tester: { "ready": ${tester.ready}, "backupList": ${JSON.stringify(tester.backupList)} }`)
        }
      }

      const ipChecker = createIpChecker(tester)

      dns.lookup(hostname, ipChecker, { family: 6 }).then((ip) => {
        const normalizedIp = normalizeIp(ip)
        if (normalizedIp && normalizedIp !== hostname) {
          if (isDnsIntercept) {
            isDnsIntercept.dns = dns
            isDnsIntercept.hostname = hostname
            isDnsIntercept.ip = normalizedIp
          }
          if (res) {
            res.setHeader('DS-DNS-Lookup', `DNS: ${normalizedIp} ${dns.dnsName === '预设IP' ? 'PreSet' : dns.dnsName}`)
          }
          callback(null, normalizedIp, 6)
          return
        }
        
        // 回退到IPv4查询
        return dns.lookup(hostname)
      }).then((ip) => {
        const normalizedIp = normalizeIp(ip)
        if (!normalizedIp || normalizedIp === hostname) {
          // 使用默认dns
          return defaultDns.lookup(hostname, options, callback)
        }
        if (isDnsIntercept) {
          isDnsIntercept.dns = dns
          isDnsIntercept.hostname = hostname
          isDnsIntercept.ip = normalizedIp
        }

        if (normalizedIp !== hostname) {
          log.info(`----- ${action}: ${hostname}, use ip from dns '${dns.dnsName}': ${normalizedIp}${target} -----`)
          if (res) {
            res.setHeader('DS-DNS-Lookup', `DNS: ${normalizedIp} ${dns.dnsName === '预设IP' ? 'PreSet' : dns.dnsName}`)
          }
          callback(null, normalizedIp, 4)
        } else {
          // 使用默认dns
          log.info(`----- ${action}: ${hostname}, use default DNS: ${hostname}${target}, options:`, options, ', dns:', dns)
          defaultDns.lookup(hostname, options, callback)
        }
      })
    }
  },
}
