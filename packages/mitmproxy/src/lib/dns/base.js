const LRUCache = require('lru-cache')
const log = require('../../utils/util.log')
const { DynamicChoice } = require('../choice/index')

const cacheSize = 1024

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
  constructor () {
    this.cache = new LRUCache({
      maxSize: cacheSize,
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
      let ipList = await this._lookup(hostname)
      if (ipList == null) {
        // 没有获取到ipv4地址
        ipList = []
      }
      ipList.push(hostname) // 把原域名加入到统计里去

      ipCache.setBackupList(ipList)
      log.info(`[DNS]: ${hostname} ➜ ${ipCache.value} (${new Date() - t} ms), ipList: ${JSON.stringify(ipList)}, ipCache:`, JSON.stringify(ipCache))

      return ipCache.value
    } catch (error) {
      log.error(`[DNS] cannot resolve hostname ${hostname}, error:`, error)
      return hostname
    }
  }
}
