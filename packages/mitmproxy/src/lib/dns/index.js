const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverIpAddress = require('./ipaddress.js')
const matchUtil = require('../../utils/util.match')

module.exports = {
  initDNS (dnsProviders) {
    const dnsMap = {}
    for (const provider in dnsProviders) {
      const conf = dnsProviders[provider]
      if (conf.type === 'ipaddress') {
        dnsMap[provider] = new DNSOverIpAddress(conf.server)
        continue
      }
      dnsMap[provider] = conf.type === 'https' ? new DNSOverHTTPS(conf.server) : new DNSOverTLS(conf.server)
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
