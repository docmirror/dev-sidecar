const speedTest = require('../../speed')
const log = require('../../../utils/util.log')
const defaultDns = require('dns')

module.exports = {
  createLookupFunc: function (dns, action, target, isDnsIntercept) {
    return (hostname, options, callback) => {
      const tester = speedTest.getSpeedTester(hostname)
      if (tester && tester.ready) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj) {
          log.info(`----- ${action}: ${target}, use alive ip from dns '${aliveIpObj.dns}': ${aliveIpObj.host} -----`)
          callback(null, aliveIpObj.host, 4)
          return
        } else {
          log.info(`----- ${action}: ${target}, no alive ip, tester:`, tester)
        }
      }
      dns.lookup(hostname).then(ip => {
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
            log.info(`----- ${action}: ${target}, use ip from dns '${dns.name}': ${ip} -----`)
            callback(null, ip, 4)
            return
          } else {
            // 使用默认dns
            log.info(`----- ${action}: ${target}, use hostname by default DNS: ${hostname}, skip test failed ip from dns '${dns.name}: ${ip}', options:`, options)
          }
        } else {
          // 使用默认dns
          log.info(`----- ${action}: ${target}, use hostname by default DNS: ${hostname}, options:`, options, ', dns:', dns)
        }
        defaultDns.lookup(hostname, options, callback)
      })
    }
  }
}
