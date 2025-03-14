const { promisify } = require('node:util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer) {
    super(dnsName, 'HTTPS', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
  }

  _dnsQueryPromise (hostname, type = 'A') {
    return dohQueryAsync({ url: this.dnsServer }, [{ type, name: hostname }])
  }
}
