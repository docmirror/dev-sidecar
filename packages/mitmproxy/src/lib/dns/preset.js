const matchUtil = require('../../utils/util.match')
const BaseDNS = require('./base')

function mapToList (ipMap) {
  const ipList = []
  for (const key in ipMap) {
    if (!ipMap[key]) {
      continue
    }
    ipList.push(key)
  }
  return ipList
}

module.exports = class DNSOverPreSetIpList extends BaseDNS {
  constructor (preSetIpList) {
    super()
    this.preSetIpList = preSetIpList
    this.name = 'PreSet'
    this.type = 'PreSet'
  }

  async _lookup (hostname) {
    // 获取当前域名的预设IP列表
    let hostnamePreSetIpList = matchUtil.matchHostname(this.preSetIpList, hostname, 'matched preSetIpList')
    if (hostnamePreSetIpList && (hostnamePreSetIpList.length > 0 || hostnamePreSetIpList.length === undefined)) {
      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList = hostnamePreSetIpList.slice()
      } else {
        hostnamePreSetIpList = mapToList(hostnamePreSetIpList)
      }

      if (hostnamePreSetIpList.length > 0) {
        return hostnamePreSetIpList
      }
    }

    // 未预设当前域名的IP列表
    return []
  }
}
