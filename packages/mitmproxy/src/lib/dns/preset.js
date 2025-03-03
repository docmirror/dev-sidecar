const BaseDNS = require('./base')

module.exports = class DNSOverPreSetIpList extends BaseDNS {
  constructor (preSetIpList) {
    super('PreSet', null, preSetIpList)
    this.name = 'PreSet'
    this.type = 'PreSet'
  }

  async _lookup (_hostname) {
    return []
  }
}
