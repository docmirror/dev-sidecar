const { promisify } = require('node:util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer) {
    super(dnsName, cacheSize, preSetIpList)
    this.dnsServer = dnsServer
  }

  async _doDnsQuery (hostname) {
    return await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
  }
}
