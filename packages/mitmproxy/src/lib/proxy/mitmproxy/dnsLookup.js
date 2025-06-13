const defaultDns = require('node:dns')
const log = require('../../../utils/util.log.server')
const speedTest = require('../../speed')

module.exports = {
  createLookupFunc (res, dns, action, target, isDnsIntercept) {
    target = target ? (`, target: ${target}`) : ''

    return (hostname, options, callback) => {
      const tester = speedTest.getSpeedTester(hostname)
      if (tester) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj) {
          const family = aliveIpObj.host.includes(':') ? 6 : 4
          if (res) {
            res.setHeader('DS-DNS-Lookup', `IpTester: ${aliveIpObj.host} ${aliveIpObj.dns === '预设IP' ? 'PreSet' : aliveIpObj.dns}`)
          }
          callback(null, aliveIpObj.host, family)
          return
        }
      }
      
      // 优先尝试IPv6查询
      dns.lookup(hostname, { family: 6 }).then((ip) => {
        if (ip && ip !== hostname) {
          if (isDnsIntercept) {
            isDnsIntercept.dns = dns
            isDnsIntercept.hostname = hostname
            isDnsIntercept.ip = ip
          }
          if (res) {
            res.setHeader('DS-DNS-Lookup', `DNS: ${ip} ${dns.dnsName === '预设IP' ? 'PreSet' : dns.dnsName}`)
          }
          callback(null, ip, 6)
          return
        }
        
        // 回退到IPv4查询
        return dns.lookup(hostname)
      }).then((ip) => {
        if (!ip || ip === hostname) {
          // 使用默认dns
          return defaultDns.lookup(hostname, options, callback)
        }

        if (isDnsIntercept) {
          isDnsIntercept.dns = dns
          isDnsIntercept.hostname = hostname
          isDnsIntercept.ip = ip
        }

        // 判断是否为测速失败的IP
        let isTestFailedIp = false
        if (tester && tester.ready && tester.backupList && tester.backupList.length > 0) {
          for (let i = 0; i < tester.backupList.length; i++) {
            const item = tester.backupList[i]
            if (item.host === ip) {
              if (item.time == null) {
                isTestFailedIp = true
              }
              break
            }
          }
        }

        if (!isTestFailedIp) {
          const family = ip.includes(':') ? 6 : 4
          if (res) {
            res.setHeader('DS-DNS-Lookup', `DNS: ${ip} ${dns.dnsName === '预设IP' ? 'PreSet' : dns.dnsName}`)
          }
          callback(null, ip, family)
        } else {
          // 使用默认dns
          defaultDns.lookup(hostname, options, callback)
        }
      }).catch((e) => {
        log.error(`DNS lookup error for ${hostname}:`, e)
        defaultDns.lookup(hostname, options, callback)
      })
    }
  },
}
