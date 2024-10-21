const DNSOverTLS = require('./tls.js')
const DNSOverHTTPS = require('./https.js')
const DNSOverIpAddress = require('./ipaddress.js')
const matchUtil = require('../../utils/util.match')
const log = require('../../utils/util.log')

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
      dnsMap[provider].type = conf.type
    }
    return dnsMap
  },
  hasDnsLookup (dnsConfig, hostname) {
    let providerName = matchUtil.matchHostname(dnsConfig.mapping, hostname, 'get dns providerName')

    // usa已重命名为cloudflare，以下为向下兼容处理
    if (providerName === 'usa' && dnsConfig.providers[providerName] == null) {
      providerName = 'cloudflare'
    }

    // 如果为空，尝试从预设IP中匹配，如果配置过预设IP，则随便
    if (providerName == null || dnsConfig.providers[providerName] == null) {
      const hostnamePreSetIpList = matchUtil.matchHostname(dnsConfig.preSetIpList, hostname, 'matched preSetIpList')
      if (hostnamePreSetIpList) {
        for (const name in dnsConfig.providers) {
          const provider = dnsConfig.providers[name]
          if (provider.type === 'https') {
            log.debug(`当前域名未配置过DNS，但配置了预设IP，现返回DNS '${name}' 作为预设IP的使用工具，hostname: ${hostname}, preSetIpList:`, hostnamePreSetIpList)
            return dnsConfig.providers[name]
          }
        }
      }
    }

    if (providerName) {
      return dnsConfig.providers[providerName]
    }
  }
}
