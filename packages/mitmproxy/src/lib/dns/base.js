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
  constructor (dnsName, dnsType, cacheSize, preSetIpList) {
    this.dnsName = dnsName
    this.dnsType = dnsType
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

  async lookup (hostname, ipChecker) {
    try {
      let ipCache = this.cache.get(hostname)
      if (ipCache) {
        const ip = ipCache.value
        if (ip != null) {
          if (ipChecker && ipChecker(ip)) {
            ipCache.doCount(ip, false)
            return ip
          } else {
            return hostname
          }
        }
      } else {
        ipCache = new IpCache(hostname)
        this.cache.set(hostname, ipCache)
      }

      const t = new Date()
      let ipList = await this._lookupWithPreSetIpList(hostname)
      if (ipList == null) {
        // 没有获取到ipv4地址
        ipList = []
      }
      ipList.push(hostname) // 把原域名加入到统计里去

      ipCache.setBackupList(ipList)

      const ip = ipCache.value
      log.info(`[DNS-over-${this.dnsType} '${this.dnsName}'] ${hostname} ➜ ${ip} (${new Date() - t} ms), ipList: ${JSON.stringify(ipList)}, ipCache:`, JSON.stringify(ipCache))

      if (ipChecker) {
        if (ip != null && ip !== hostname && ipChecker(ip)) {
          return ip
        }

        for (const ip of ipList) {
          if (ip !== hostname && ipChecker(ip)) {
            return ip
          }
        }
      }

      return ip != null ? ip : hostname
    } catch (error) {
      log.error(`[DNS-over-${this.dnsType} '${this.dnsName}'] cannot resolve hostname ${hostname}, error:`, error)
      return hostname
    }
  }

  async _lookupWithPreSetIpList (hostname) {
    // 获取当前域名的预设IP列表
    let hostnamePreSetIpList = matchUtil.matchHostname(this.preSetIpList, hostname, `matched preSetIpList(${this.dnsName})`)
    if (hostnamePreSetIpList && (hostnamePreSetIpList.length > 0 || hostnamePreSetIpList.length === undefined)) {
      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList = hostnamePreSetIpList.slice() // 复制一份列表数据，避免配置数据被覆盖
      } else {
        hostnamePreSetIpList = mapToList(hostnamePreSetIpList)
      }

      if (hostnamePreSetIpList.length > 0) {
        hostnamePreSetIpList.isPreSet = true
        log.info(`[DNS-over-PreSet '${this.dnsName}'] 获取到该域名的预设IP列表： ${hostname} - ${JSON.stringify(hostnamePreSetIpList)}`)
        return hostnamePreSetIpList
      }
    }

    return await this._lookup(hostname)
  }

  async _lookup (hostname) {
    const start = Date.now()
    try {
      // 执行DNS查询
      log.debug(`[DNS-over-${this.dnsType} '${this.dnsName}'] query start: ${hostname}`)
      const response = await this._doDnsQuery(hostname)
      const cost = Date.now() - start
      log.debug(`[DNS-over-${this.dnsType} '${this.dnsName}'] query end: ${hostname}, cost: ${cost} ms, response:`, response)

      if (response == null || response.answers == null || response.answers.length == null || response.answers.length === 0) {
        log.warn(`[DNS-over-${this.dnsType} '${this.dnsName}'] 没有该域名的IP地址: ${hostname}, cost: ${cost} ms, response:`, response)
        return []
      }

      const ret = response.answers.filter(item => item.type === 'A').map(item => item.data)
      if (ret.length === 0) {
        log.info(`[DNS-over-${this.dnsType} '${this.dnsName}'] 没有该域名的IP地址: ${hostname}, cost: ${cost} ms`)
      } else {
        log.info(`[DNS-over-${this.dnsType} '${this.dnsName}'] 获取到该域名的IP地址： ${hostname} - ${JSON.stringify(ret)}, cost: ${cost} ms`)
      }

      return ret
    } catch (e) {
      log.error(`[DNS-over-${this.dnsType} '${this.dnsName}'] DNS query error, hostname: ${hostname}${this.dnsServer ? `, dnsServer: ${this.dnsServer}` : ''}, cost: ${Date.now() - start} ms, error:`, e)
      return []
    }
  }

  _doDnsQuery (hostname, type) {
    return new Promise((resolve, reject) => {
      // 设置超时任务
      let isOver = false
      const timeout = 6000
      const timeoutId = setTimeout(() => {
        if (!isOver) {
          reject(new Error('DNS查询超时'))
        }
      }, timeout)

      try {
        this._dnsQueryPromise(hostname, type)
          .then((response) => {
            isOver = true
            clearTimeout(timeoutId)
            resolve(response)
          })
          .catch((e) => {
            isOver = true
            clearTimeout(timeoutId)
            reject(e)
          })
      } catch (e) {
        isOver = true
        clearTimeout(timeoutId)
        reject(e)
      }
    })
  }
}
