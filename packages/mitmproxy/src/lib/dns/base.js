const LRUCache = require('lru-cache')
const log = require('../../utils/util.log.server')
const matchUtil = require('../../utils/util.match')
const { DynamicChoice } = require('../choice/index')

function mapToList (ipMap) {
  const ipList = []
  for (const key in ipMap) {
    if (ipMap[key]) { // 配置为 ture 时才生效
      ipList.push(key)
    }
  }
  return ipList
}

const defaultCacheSize = 1024

class IpCache extends DynamicChoice {
  constructor (hostname) {
    super(hostname)
    this.lookupCount = 0
  }

  /**
   * 设置新的ipList
   *
   * @param newBackupList
   */
  setBackupList (newBackupList) {
    super.setBackupList(newBackupList)
    this.lookupCount++
  }
}

module.exports = class BaseDNS {
  constructor (dnsName, cacheSize, preSetIpList) {
    this.dnsName = dnsName
    this.preSetIpList = preSetIpList
    this.cache = new LRUCache({
      maxSize: (cacheSize > 0 ? cacheSize : defaultCacheSize),
      sizeCalculation: () => {
        return 1
      },
    })
  }

  count (hostname, ip, isError = true) {
    const ipCache = this.cache.get(hostname)
    if (ipCache) {
      ipCache.doCount(ip, isError)
    }
  }

  async lookup (hostname) {
    try {
      let ipCache = this.cache.get(hostname)
      if (ipCache) {
        if (ipCache.value != null) {
          ipCache.doCount(ipCache.value, false)
          return ipCache.value
        }
      } else {
        ipCache = new IpCache(hostname)
        this.cache.set(hostname, ipCache)
      }

      const t = new Date()
      let ipList = await this._lookupInternal(hostname)
      if (ipList == null) {
        // 没有获取到ipv4地址
        ipList = []
      }
      ipList.push(hostname) // 把原域名加入到统计里去

      ipCache.setBackupList(ipList)
      log.info(`[DNS '${this.dnsName}']: ${hostname} ➜ ${ipCache.value} (${new Date() - t} ms), ipList: ${JSON.stringify(ipList)}, ipCache:`, JSON.stringify(ipCache))

      return ipCache.value
    } catch (error) {
      log.error(`[DNS '${this.dnsName}'] cannot resolve hostname ${hostname}, error:`, error)
      return hostname
    }
  }

  async _lookupInternal (hostname) {
    // 获取当前域名的预设IP列表
    let hostnamePreSetIpList = matchUtil.matchHostname(this.preSetIpList, hostname, 'matched preSetIpList')
    if (hostnamePreSetIpList && (hostnamePreSetIpList.length > 0 || hostnamePreSetIpList.length === undefined)) {
      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList = hostnamePreSetIpList.slice()
      } else {
        hostnamePreSetIpList = mapToList(hostnamePreSetIpList)
      }

      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList.isPreSet = true
        return hostnamePreSetIpList
      }
    }

    return await this._lookup(hostname)
  }

  async _lookup (hostname) {
    const start = Date.now()
    try {
      const response = await this._doDnsQuery(hostname)
      const cost = Date.now() - start
      if (response == null || response.answers == null || response.answers.length == null || response.answers.length === 0) {
        // 说明没有获取到ip
        log.warn(`DNS '${this.dnsName}' 没有该域名的IP地址: ${hostname}, cost: ${cost} ms, response:`, response)
        return []
      }
      const ret = response.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info(`DNS '${this.dnsName}' 没有该域名的IPv4地址: ${hostname}, cost: ${cost} ms`)
      } else {
        log.info(`DNS '${this.dnsName}' 获取到该域名的IPv4地址： ${hostname} - ${JSON.stringify(ret)}, cost: ${cost} ms`)
      }
      return ret
    } catch (e) {
      log.error(`DNS query error: ${hostname}, dns: ${this.dnsName}${this.dnsServer ? (`, dnsServer: ${this.dnsServer}`) : ''}, cost: ${Date.now() - start} ms, error:`, e)
      return []
    }
  }
}
