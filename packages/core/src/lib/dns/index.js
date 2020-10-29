const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
module.exports = {
  initDNS (dnsProviders) {
    const dnsMap = {}
    for (const provider in dnsProviders) {
      const conf = dnsProviders[provider]
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
      console.log('匹配到dns:', providerName, hostname)
      return dnsConfig.providers[providerName]
    }
  }
}
