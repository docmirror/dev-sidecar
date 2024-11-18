const { promisify } = require('node:util')
const doh = require('dns-over-http')
const log = require('../../utils/util.log')
const matchUtil = require('../../utils/util.match')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

function mapToList (ipMap) {
  const ipList = []
  for (const key in ipMap) {
    if (!ipMap[key]) {
      continue
    }
    ipList.push(ipMap[key])
  }
  return ipList
}

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsServer, preSetIpList) {
    super()
    this.dnsServer = dnsServer
    this.preSetIpList = preSetIpList
  }

  async _lookup (hostname) {
    // 获取当前域名的预设IP列表
    let hostnamePreSetIpList = matchUtil.matchHostname(this.preSetIpList, hostname, 'matched preSetIpList')
    if (hostnamePreSetIpList && (hostnamePreSetIpList.length > 0 || hostnamePreSetIpList.length === undefined)) {
      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList = hostnamePreSetIpList.slice()
      } else {
        hostnamePreSetIpList = mapToList(hostnamePreSetIpList)
      }

      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList.isPreSet = true
        return hostnamePreSetIpList
      }
    }

    // 未预设当前域名的IP列表，则从dns服务器获取
    const start = new Date()
    try {
      const result = await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
      if (result.answers.length === 0) {
        // 说明没有获取到ip
        log.info('该域名没有ip地址解析:', hostname, ', cost:', (new Date() - start), 'ms')
        return []
      }
      const ret = result.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info('该域名没有IPv4地址解析:', hostname, ', cost:', (new Date() - start), 'ms')
      } else {
        log.info('获取到域名地址：', hostname, JSON.stringify(ret), ', cost:', (new Date() - start), 'ms')
      }
      return ret
    } catch (e) {
      log.warn('DNS query error:', hostname, ', dns:', this.dnsServer, ', cost:', (new Date() - start), 'ms, error:', e)
      return []
    }
  }
}
