const dnstls = require('./util/dns-over-tls')
const BaseDNS = require('./base')

const defaultPort = 853

module.exports = class DNSOverTLS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerPort, dnsFamily, dnsServerName) {
    super(dnsServer.replace(/\s+/, ''), dnsFamily, dnsName, 'TLS', cacheSize, preSetIpList)
    this.dnsServerPort = Number.parseInt(dnsServerPort) || defaultPort
    this.dnsServerName = dnsServerName
  }

  _dnsQueryPromise (hostname, type = 'A') {
    const options = {
      host: this.dnsServer,
      port: this.dnsServerPort,
      servername: this.dnsServerName || this.dnsServer,
      family: this.dnsFamily,
      rejectUnauthorized: !this.dnsServerName,

      name: hostname,
      klass: 'IN',
      type,

      timeout: 4000,
    }

    return dnstls.query(options)
  }
}
