const { promisify } = require('util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')

const dohQueryAsync = promisify(doh.query)

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsServer) {
    super()
    this.dnsServer = dnsServer
  }

  async _lookup (hostname) {
    const result = await dohQueryAsync({ url: this.dnsServer }, [{ type: 'A', name: hostname }])
    return result.answers[0].data
  }
}
