const dnstls = require('dns-over-tls')
const BaseDNS = require('./base')

const defaultPort = 853

module.exports = class DNSOverTLS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort, dnsServerName) {
    super(dnsName, cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
    this.dnsServerName = dnsServerName
  }

  async _doDnsQuery (hostname) {
    const options = {
      host: this.dnsServer,
      port: this.dnsServerPort,
      servername: this.dnsServerName || this.dnsServer,

      name: hostname,
      klass: 'IN',
      type: 'A',
    }

    return await dnstls.query(options)
  }
}
