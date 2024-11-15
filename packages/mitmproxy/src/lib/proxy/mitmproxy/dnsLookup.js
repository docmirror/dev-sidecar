const defaultDns = require('dns')
const log = require('../../../utils/util.log')
const speedTest = require('../../speed')

module.exports = {
  createLookupFunc (res, dns, action, target, isDnsIntercept) {
    target = target ? (`, target: ${target}`) : ''

    return (hostname, options, callback) => {
      const tester = speedTest.getSpeedTester(hostname)
      if (tester) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj) {
          log.info(`----- ${action}: ${hostname}, use alive ip from dns '${aliveIpObj.dns}': ${aliveIpObj.host}${target} -----`)
          if (res) {
            res.setHeader('DS-DNS-Lookup', `IpTester: ${aliveIpObj.host} ${aliveIpObj.dns === '预设IP' ? 'PreSet' : aliveIpObj.dns}`)
          }
          callback(null, aliveIpObj.host, 4)
          return
        } else {
          log.info(`----- ${action}: ${hostname}, no alive ip${target}, tester: { "ready": ${tester.ready}, "backupList": ${JSON.stringify(tester.backupList)} }`)
        }
      }
      dns.lookup(hostname).then((ip) => {
        if (isDnsIntercept) {
          isDnsIntercept.dns = dns
          isDnsIntercept.hostname = hostname
          isDnsIntercept.ip = ip
        }

        if (ip !== hostname) {
          // 判断是否为测速失败的IP，如果是，则不使用当前IP
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
          if (isTestFailedIp === false) {
            log.info(`----- ${action}: ${hostname}, use ip from dns '${dns.name}': ${ip}${target} -----`)
            if (res) {
              res.setHeader('DS-DNS-Lookup', `DNS: ${ip} ${dns.name === '预设IP' ? 'PreSet' : dns.name}`)
            }
            callback(null, ip, 4)
            return
          } else {
            // 使用默认dns
            log.info(`----- ${action}: ${hostname}, use hostname by default DNS: ${hostname}, skip test failed ip from dns '${dns.name}: ${ip}'${target}, options:`, options)
          }
        } else {
          // 使用默认dns
          log.info(`----- ${action}: ${hostname}, use hostname by default DNS: ${hostname}${target}, options:`, options, ', dns:', dns)
        }
        defaultDns.lookup(hostname, options, callback)
      })
    }
  }
}
