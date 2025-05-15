const { promisify } = require('node:util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const HttpsAgent = require('../proxy/common/ProxyHttpsAgent')
const Agent = require('../proxy/common/ProxyHttpAgent')

const dohQueryAsync = promisify(doh.query)

function createAgent (dnsServer) {
  return new (dnsServer.startsWith('https:') ? HttpsAgent : Agent)({
    keepAlive: true,
    timeout: 20000,
  })
}

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsServerName) {
    super(dnsName, 'HTTPS', cacheSize, preSetIpList)
    this.dnsServer = dnsServer.replace(/\s+/, '')
    this.dnsServerName = dnsServerName
  }

  _dnsQueryPromise (hostname, type = 'A') {
    // 请求参数
    const options = {
      url: this.dnsServer,
      agent: createAgent(this.dnsServer),
    }
    if (this.dnsServerName) {
      // 设置SNI
      options.servername = this.dnsServerName
      options.rejectUnauthorized = false
    }

    // DNS查询参数
    const questions = [
      {
        type,
        name: hostname,
      },
    ]

    return dohQueryAsync(options, questions)
  }
}
