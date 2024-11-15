const dnstls = require('dns-over-tls')
const log = require('../../utils/util.log')
const BaseDNS = require('./base')

module.exports = class DNSOverTLS extends BaseDNS {
  async _lookup (hostname) {
    const { answers } = await dnstls.query(hostname)

    const answer = answers.find(answer => answer.type === 'A' && answer.class === 'IN')

    log.info('DNS lookup：', hostname, answer)
    if (answer) {
      return answer.data
    }
  }
}
