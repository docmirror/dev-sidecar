const defaultDns = require('node:dns')
const net = require('node:net')
const log = require('../../../utils/util.log.server')
const speedTest = require('../../speed')

function normalizeIp(ip) {
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

  // IPv4:port (禁止使用IPv6:port格式)
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

function createIpChecker(tester) {
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
  createLookupFunc(res, dns, action, target, port, isDnsIntercept) {
    target = target ? (`, target: ${target}`) : ''

    return (hostname, options, callback) => {
      // 1. 获取调用者期望的 IP 版本 (0: 任意, 4: IPv4, 6: IPv6)
      // 如果 options 是对象则取 family，否则默认为 0
      const reqFamily = (typeof options === 'object' && options !== null) ? (options.family || 0) : 0

      const tester = speedTest.getSpeedTester(hostname, port)
      
      // --- 逻辑分支 A: 使用测速结果 ---
      if (tester) {
        const aliveIpObj = tester.pickFastAliveIpObj()
        if (aliveIpObj) {
          const aliveIp = normalizeIp(aliveIpObj.host)
          // 使用 net.isIP 判断更准确 (0: 无效, 4: IPv4, 6: IPv6)
          const ipType = net.isIP(aliveIp) 
          
          // reqFamily === 0 接受所有有效 IP
          // reqFamily === 4 只接受 IPv4
          // reqFamily === 6 只接受 IPv6
          if (ipType !== 0 && (reqFamily === 0 || reqFamily === ipType)) {
            log.info(`----- ${action}: ${hostname}, use alive ip from dns '${aliveIpObj.dns}': ${aliveIp}${target} -----`)
            if (res) {
              res.setHeader('DS-DNS-Lookup', `IpTester: ${aliveIp} ${aliveIpObj.dns === '预设IP' ? 'PreSet' : aliveIpObj.dns}`)
            }
            callback(null, aliveIp, ipType)
            return
          } else {
            // 如果找到了测速IP但类型不匹配（例如要v4但只有v6），记录日志并继续走 DNS 查询
            log.info(`----- ${action}: ${hostname}, alive ip type mismatch (req: v${reqFamily}, got: v${ipType})${target} -----`)
          }
        } else {
          log.info(`----- ${action}: ${hostname}, no alive ip${target}, tester: { "ready": ${tester.ready}, "backupList": ${JSON.stringify(tester.backupList)} }`)
        }
      }

      const ipChecker = createIpChecker(tester)

      // --- 逻辑分支 B: 自定义 DNS 查询 ---

      // 封装成功回调，复用逻辑
      const handleSuccess = (ip, family) => {
        const normalizedIp = normalizeIp(ip)
        
        // 再次检查归一化后的 IP 是否符合要求
        const detectedFamily = net.isIP(normalizedIp)
        if (detectedFamily === 0 || (reqFamily !== 0 && reqFamily !== detectedFamily)) {
          // 如果解析出的 IP 无效或版本不对，回退到默认 DNS
          return defaultDns.lookup(hostname, options, callback)
        }

        if (normalizedIp && normalizedIp !== hostname) {
          if (isDnsIntercept) {
            isDnsIntercept.dns = dns
            isDnsIntercept.hostname = hostname
            isDnsIntercept.ip = normalizedIp
          }
          if (res) {
            res.setHeader('DS-DNS-Lookup', `DNS: ${normalizedIp} ${dns.dnsName === '预设IP' ? 'PreSet' : dns.dnsName}`)
          }
          
          log.info(`----- ${action}: ${hostname}, use ip from dns '${dns.dnsName}': ${normalizedIp}${target} -----`)
          callback(null, normalizedIp, detectedFamily)
        } else {
          // 如果解析结果和 hostname 一样，或是空的，回退默认
          defaultDns.lookup(hostname, options, callback)
        }
      }
      
      const tryIPv6 = () => {
        return dns.lookup(hostname, ipChecker, { family: 6 }).then((ip) => {
            handleSuccess(ip, 6)
        })
      }

      const tryIPv4 = () => {
        return dns.lookup(hostname, ipChecker, { family: 4 }).then((ip) => {
           handleSuccess(ip, 4)
        })
      }
      
      // 错误处理：如果自定义DNS失败，回退到默认DNS
      const handleError = (err) => {
         defaultDns.lookup(hostname, options, callback)
      }

      if (reqFamily === 6) {
        // 只查 v6
        tryIPv6().catch(handleError)
      } else if (reqFamily === 4) {
        // 只查 v4
        tryIPv4().catch(handleError)
      } else {
        // reqFamily === 0 (默认行为)：先查 v6，失败查 v4
        // 原有逻辑是优先 v6
        tryIPv6().catch(() => {
          // v6 失败，尝试 v4
          return tryIPv4()
        }).catch(() => {
          // v4 也失败，使用系统默认
          log.info(`----- ${action}: ${hostname}, use default DNS: ${hostname}${target}, options:`, options, ', dns:', dns)
          defaultDns.lookup(hostname, options, callback)
        })
      }
    }
  },
}
