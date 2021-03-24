const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverIpAddress = require('./ipaddress.js')
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
    let providerName = dnsConfig.mapping[hostname]
    if (!providerName) {
      for (const target in dnsConfig.mapping) {
        if (target.indexOf('*') < 0) {
          continue
        }
        const regexp = target.replace(/\./g, '\\.').replace(/\*/g, '.*')
        if (hostname.match(regexp)) {
          providerName = dnsConfig.mapping[target]
        }
      }
    }
    if (providerName) {
      return dnsConfig.providers[providerName]
    }
  }
}
