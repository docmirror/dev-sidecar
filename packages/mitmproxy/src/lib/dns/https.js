const { promisify } = require('node:util')
const doh = require('dns-over-http')
const log = require('../../utils/util.log')
const matchUtil = require('../../utils/util.match')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

function mapToList (ipMap) {
  const ipList = []
  for (const key in ipMap) {
    if (ipMap[key]) { // 配置为 ture 时才生效
      ipList.push(key)
    }
  }
  return ipList
}

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, dnsServer, preSetIpList) {
    super(dnsName)
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
      const cost = new Date() - start
      if (result.answers.length === 0) {
        // 说明没有获取到ip
        log.info(`DNS '${this.dnsName}' 没有该域名的IP地址: ${hostname}, cost: ${cost} ms`)
        return []
      }
      const ret = result.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info(`DNS '${this.dnsName}' 没有该域名的IPv4地址: ${hostname}, cost: ${cost} ms`)
      } else {
        log.info(`DNS '${this.dnsName}' 获取到该域名的IPv4地址： ${hostname} ${JSON.stringify(ret)}, cost: ${cost} ms`)
      }
      return ret
    } catch (e) {
      log.warn(`DNS query error: ${hostname}, dns: ${this.dnsName}, dnsServer: ${this.dnsServer}, cost: ${new Date() - start} ms, error:`, e)
      return []
    }
  }
}
