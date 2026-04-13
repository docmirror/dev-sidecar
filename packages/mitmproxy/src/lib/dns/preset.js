const BaseDNS = require('./base')

module.exports = class DNSOverPreSetIpList extends BaseDNS {
  constructor (preSetIpList) {
    super(null, null, 'PreSet', 'PreSet', null, preSetIpList)
  }

  async _lookup (_hostname, _options) {
    return []
  }
}
