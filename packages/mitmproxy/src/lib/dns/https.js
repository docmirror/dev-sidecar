const { promisify } = require('node:util')
const doh = require('dns-over-http')
const BaseDNS = require('./base')
const HttpsAgent = require('../proxy/common/ProxyHttpsAgent')
const Agent = require('../proxy/common/ProxyHttpAgent')

const dohQueryAsync = promisify(doh.query)

function createAgent (dnsServer) {
  return new (dnsServer.startsWith('https:') ? HttpsAgent : Agent)({
    keepAlive: true,
    timeout: 4000,
  })
}

module.exports = class DNSOverHTTPS extends BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList, dnsServer, dnsFamily, dnsServerName) {
    super(dnsServer.replace(/\s+/, ''), dnsFamily, dnsName, 'HTTPS', cacheSize, preSetIpList)
    this.dnsServerName = dnsServerName
    this.agent = createAgent(this.dnsServer)
  }

  _dnsQueryPromise (hostname, type = 'A') {
    // 请求参数
    const options = {
      url: this.dnsServer,
      agent: this.agent,
    }
    if (this.dnsServerName) {
      // 设置SNI
      options.servername = this.dnsServerName
      options.rejectUnauthorized = false
    }
    if (this.dnsFamily === 6) {
      options.family = 6
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
