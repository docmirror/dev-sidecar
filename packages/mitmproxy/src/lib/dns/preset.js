const BaseDNS = require('./base')

module.exports = class DNSOverPreSetIpList extends BaseDNS {
  constructor (preSetIpList) {
    super('PreSet', 'PreSet', null, preSetIpList)
  }

  async _lookup (_hostname) {
    return []
  }
}
