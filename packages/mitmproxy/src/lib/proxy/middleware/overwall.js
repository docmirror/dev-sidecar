const url = require('url')
const pac = require('./source/pac')
const matchUtil = require('../../../utils/util.match')

function matched (hostname, regexpMap) {
  const ret1 = matchUtil.matchHostname(regexpMap, hostname)
  if (ret1) {
    return true
  }
  const ret = pac.FindProxyForURL('https://' + hostname, hostname)
  if (ret && ret.indexOf('PROXY ') === 0) {
    return true
  }
  return false
}

module.exports = function createOverWallIntercept (overWallConfig) {
  if (!overWallConfig || overWallConfig.enabled !== true) {
    return null
  }
  let server = overWallConfig.server
  let keys = Object.keys(server)
  if (keys.length === 0) {
    server = overWallConfig.serverDefault
    keys = Object.keys(server)
  }
  if (keys.length === 0) {
    return null
  }
  const regexpMap = matchUtil.domainMapRegexply(overWallConfig.targets)
  return {
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      return matched(hostname, regexpMap)
    },
    requestIntercept (context, req, res, ssl, next) {
      const { rOptions, log, RequestCounter } = context
      if (rOptions.protocol === 'http:') {
        return
      }
      const hostname = rOptions.hostname
      if (!matched(hostname, regexpMap)) {
        return
      }
      const cacheKey = '__over_wall_proxy__'
      let proxyServer = keys[0]
      if (RequestCounter && keys.length > 1) {
        const count = RequestCounter.getOrCreate(cacheKey, keys)
        if (count.value == null) {
          count.doRank()
        }
        if (count.value == null) {
          log.error('count value is null', count)
        } else {
          count.doCount(count.value)
          proxyServer = count.value
          context.requestCount = {
            key: cacheKey,
            value: count.value,
            count
          }
        }
      }

      const domain = proxyServer
      const port = server[domain].port
      const path = server[domain].path
      const password = server[domain].password
      const proxyTarget = domain + '/' + path + '/' + hostname + req.url

      // const backup = interceptOpt.backup
      const proxy = proxyTarget.indexOf('http') === 0 ? proxyTarget : (rOptions.protocol + '//' + proxyTarget)
      // eslint-disable-next-line node/no-deprecated-api
      const URL = url.parse(proxy)
      rOptions.protocol = URL.protocol
      rOptions.hostname = URL.host
      rOptions.host = URL.host
      rOptions.headers.host = URL.host
      if (password) {
        rOptions.headers.dspassword = password
      }
      rOptions.path = URL.path
      if (URL.port == null) {
        rOptions.port = port || (rOptions.protocol === 'https:' ? 443 : 80)
      }
      log.info('OverWall:', rOptions.hostname, proxyTarget)
      if (context.requestCount) {
        log.debug('OverWall choice:', JSON.stringify(context.requestCount))
      }

      return true
    }
  }
}
