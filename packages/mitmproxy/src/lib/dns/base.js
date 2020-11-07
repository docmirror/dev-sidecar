const LRU = require('lru-cache')
const { isIP } = require('validator')
const getLogger = require('../utils/logger')

const logger = getLogger('dns')
const cacheSize = 1024
function _isIP (v) {
  return v && isIP(v)
}

module.exports = class BaseDNS {
  constructor () {
    this.cache = new LRU(cacheSize)
  }

  async lookup (hostname) {
    try {
      let ip = this.cache.get(hostname)
      if (ip) {
        return ip
      }

      const t = new Date()

      ip = hostname
      for (let depth = 0; !_isIP(ip) && depth < 5; depth++) {
        ip = await this._lookup(ip).catch(error => {
          logger.debug(ip, error)
          return ip
        })
      }

      if (!_isIP(ip)) {
        throw new Error(`BAD IP FORMAT (${ip})`)
      }

      logger.debug(`[DNS] ${hostname} -> ${ip} (${new Date() - t} ms)`)
      this.cache.set(hostname, ip)
      return ip
    } catch (error) {
      logger.debug(`[DNS] cannot resolve hostname ${hostname} (${error})`)
      return hostname
    }
  }
}
