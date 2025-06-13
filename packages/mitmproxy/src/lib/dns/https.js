const { promisify } = require('node:util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer) {
    super(dnsName, 'HTTPS', cacheSize, preSetIpList)
    this.dnsServer = dnsServer
    this.isIPv6 = dnsServer.includes(':') && dnsServer.includes('[') && dnsServer.includes(']')
  }

  async _doDnsQuery (hostname, options = {}) {
    return await dohQueryAsync(
      { 
        url: this.dnsServer,
        family: this.isIPv6 ? 6 : 4
      }, 
      [{ 
        type: options.family === 6 ? 'AAAA' : 'A', 
        name: hostname 
      }]
    )
  }
}
