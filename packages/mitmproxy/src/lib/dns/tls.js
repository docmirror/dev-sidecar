const dnstls = require('dns-over-tls')
const BaseDNS = require('./base')
const log = require('../../utils/util.log')
module.exports = class DNSOverTLS extends BaseDNS {
  async _lookup (hostname) {
    const { answers } = await dnstls.query(hostname)

    const answer = answers.find(answer => answer.type === 'A' && answer.class === 'IN')

    log.info('dns lookup：', hostname, answer)
    if (answer) {
      return answer.data
    }
  }
}
