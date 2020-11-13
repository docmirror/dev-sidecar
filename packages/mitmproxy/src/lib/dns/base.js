const LRU = require('lru-cache')
// const { isIP } = require('validator')
const log = require('../../utils/util.log')
const cacheSize = 1024
// eslint-disable-next-line no-unused-vars
// function _isIP (v) {
//   return v && isIP(v)
// }

class IpCache {
  constructor (hostname) {
    this.hostname = hostname
    this.count = {}
    this.lookupCount = 0
    this.createTime = new Date()
  }

  /**
   * 获取到新的ipList
   * @param ipList
   */
  setIpList (ipList) {
    this.ip = ipList.shift()
    this.ipList = ipList
    this.lookupCount++
    this.doCount(this.ip, false)
  }

  /**
   * 换下一个ip
   * @param count
   */
  changeNext (count) {
    count.keepErrorCount = 0 // 清空连续失败
    if (this.ipList > 0) {
      this.ip = this.ipList.shift()
    } else {
      this.ip = null
    }
  }

  /**
   * 记录使用次数或错误次数
   * @param ip
   * @param isError
   */
  doCount (ip, isError) {
    let count = this.count[ip]
    if (count == null) {
      count = this.count[ip] = { total: 0, error: 0, keepErrorCount: 0, successRate: 0 }
    }
    if (isError) {
      count.error++
      count.keepErrorCount++
    } else {
      count.total++
    }
    count.successRate = 1 - (count.error / count.total)
    if (isError && this.ip === ip) {
      if (count.keepErrorCount >= 5) {
        this.changeNext(count)
      }
      if (count.successRate < 0.51) {
        this.changeNext(count)
      }
    }
  }
}

module.exports = class BaseDNS {
  constructor () {
    this.cache = new LRU(cacheSize)
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
        if (ipCache.ip != null) {
          ipCache.doCount(ipCache.ip, false)
          return ipCache.ip
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

      ipCache.setIpList(ipList)

      log.info(`[DNS] ${hostname} -> ${ipCache.ip} (${new Date() - t} ms)`)

      return ipCache.ip
    } catch (error) {
      log.error(`[DNS] cannot resolve hostname ${hostname} (${error})`)
      return hostname
    }
  }
}
