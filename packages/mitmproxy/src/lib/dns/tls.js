const dnstls = require('dns-over-tls')
const BaseDNS = require('./base')

const defaultPort = 853

module.exports = class DNSOverTLS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort, dnsServerName) {
    super(dnsName, 'TLS', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
    this.dnsServerName = dnsServerName
    this.isIPv6 = dnsServer.includes(':') && dnsServer.includes('[') && dnsServer.includes(']')
  }

  async _doDnsQuery (hostname, options = {}) {
    const queryOptions = {
      host: this.dnsServer,
      port: this.dnsServerPort,
      servername: this.dnsServerName || this.dnsServer,
      family: this.isIPv6 ? 6 : 4,

      name: hostname,
      klass: 'IN',
      type: options.family === 6 ? 'AAAA' : 'A',
    }

    return await dnstls.query(queryOptions)
  }
}
