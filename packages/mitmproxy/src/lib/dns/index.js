const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverIpAddress = require('./ipaddress.js')
const matchUtil = require('../../utils/util.match')

module.exports = {
  initDNS (dnsProviders, preSetIpList) {
    const dnsMap = {}
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
    }
    return dnsMap
  },
  hasDnsLookup (dnsConfig, hostname) {
    let providerName = matchUtil.matchHostname(dnsConfig.mapping, hostname, 'get dns providerName')

    // usa已重命名为cloudflare，以下为向下兼容处理
    if (providerName === 'usa') {
      providerName = 'cloudflare'
    }

    if (providerName) {
      return dnsConfig.providers[providerName]
    }
  }
}
