const dnstls = require('dns-over-tls')
const BaseDNS = require('./base')

module.exports = class DNSOverTLS extends BaseDNS {
  async _lookup (hostname) {
    const { answers } = await dnstls.query(hostname)

    const answer = answers.find(answer => answer.type === 'A' && answer.class === 'IN')

    if (answer) {
      return answer.data
    }
  }
}
