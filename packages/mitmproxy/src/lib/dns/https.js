const { promisify } = require('util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const log = require('../../utils/util.log')
const dohQueryAsync = promisify(doh.query)
const matchUtil = require('../../utils/util.match')

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsServer, preSetIpList) {
    super()
    this.dnsServer = dnsServer
    this.preSetIpList = preSetIpList
  }

  async _lookup (hostname) {
    // 获取当前域名的预设IP列表
    const hostnamePreSetIpList = matchUtil.matchHostname(this.preSetIpList, hostname, 'matched preSetIpList')
    if (hostnamePreSetIpList && hostnamePreSetIpList.length > 0) {
      hostnamePreSetIpList.isPreSet = true
      return hostnamePreSetIpList
    }

    // 未预设当前域名的IP列表，则从dns服务器获取
    try {
      const result = await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
      if (result.answers.length === 0) {
        // 说明没有获取到ip
        log.info('该域名没有ip地址解析:', hostname)
        return []
      }
      const ret = result.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info('该域名没有IPv4地址解析:', hostname)
      } else {
        log.info('获取到域名地址：', hostname, JSON.stringify(ret))
      }
      return ret
    } catch (e) {
      log.warn('DNS query error:', hostname, ', dns:', this.dnsServer, ', error:', e)
      return []
    }
  }
}
