const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverIpAddress = require('./ipaddress.js')
const DNSOverPreSetIpList = require('./preset.js')
const matchUtil = require('../../utils/util.match')

module.exports = {
  initDNS (dnsProviders, preSetIpList) {
    const dnsMap = {}

    // 创建普通的DNS
    for (const provider in dnsProviders) {
      const conf = dnsProviders[provider]

      if (conf.type === 'ipaddress') {
        dnsMap[provider] = new DNSOverIpAddress(conf.server)
      } else if (conf.type === 'https') {
        dnsMap[provider] = new DNSOverHTTPS(conf.server, preSetIpList)
      } else {
        dnsMap[provider] = new DNSOverTLS(conf.server)
      }

      // 设置DNS名称到name属性中
      dnsMap[provider].name = provider
      dnsMap[provider].type = conf.type
    }

    // 创建预设IP的DNS
    dnsMap.PreSet = new DNSOverPreSetIpList(preSetIpList)

    return dnsMap
  },
  hasDnsLookup (dnsConfig, hostname) {
    let providerName = null

    // 先匹配 预设IP配置
    const hostnamePreSetIpList = matchUtil.matchHostname(dnsConfig.preSetIpList, hostname, 'matched preSetIpList')
    if (hostnamePreSetIpList) {
      return dnsConfig.dnsMap.PreSet
    }

    // 再匹配 DNS映射配置
    providerName = matchUtil.matchHostname(dnsConfig.mapping, hostname, 'get dns providerName')

    // 由于DNS中的usa已重命名为cloudflare，所以做以下处理，为了向下兼容
    if (providerName === 'usa' && dnsConfig.dnsMap.usa == null && dnsConfig.dnsMap.cloudflare != null) {
      return dnsConfig.dnsMap.cloudflare
    }

    if (providerName) {
      return dnsConfig.dnsMap[providerName]
    }
  }
}
