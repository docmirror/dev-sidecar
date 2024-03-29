const url = require('url')
const lodash = require('lodash')
const pac = require('./source/pac')
const matchUtil = require('../../../utils/util.match')
const log = require('../../../utils/util.log')
let pacClient = null

function matched (hostname, overWallTargetMap) {
  const ret1 = matchUtil.matchHostname(overWallTargetMap, hostname, 'matched overwall')
  if (ret1) {
    return true
  }
  if (pacClient == null) {
    return false
  }
  const ret = pacClient.FindProxyForURL('https://' + hostname, hostname)
  if (ret && ret.indexOf('PROXY ') === 0) {
    log.info(`matchHostname: matched overwall: '${hostname}' -> '${ret}' in pac.txt`)
    return true
  } else {
    log.debug(`matchHostname: matched overwall: Not-Matched '${hostname}' -> '${ret}' in pac.txt`)
    return false
  }
}

module.exports = function createOverWallIntercept (overWallConfig) {
  if (!overWallConfig || overWallConfig.enabled !== true) {
    return null
  }
  if (overWallConfig.pac && overWallConfig.pac.enabled) {
    // 初始化pac
    pacClient = pac.createPacClient(overWallConfig.pac.pacFileAbsolutePath)
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
  const overWallTargetMap = matchUtil.domainMapRegexply(overWallConfig.targets)
  return {
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      return matched(hostname, overWallTargetMap)
    },
    requestIntercept (context, req, res, ssl, next) {
      const { rOptions, log, RequestCounter } = context
      if (rOptions.protocol === 'http:') {
        return
      }
      const hostname = rOptions.hostname
      if (!matched(hostname, overWallTargetMap)) {
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
      rOptions.origional = lodash.cloneDeep(rOptions) // 备份原始请求参数
      delete rOptions.origional.agent
      delete rOptions.origional.headers
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
      log.info('OverWall:', rOptions.hostname, '➜', proxyTarget)
      if (context.requestCount) {
        log.debug('OverWall choice:', JSON.stringify(context.requestCount))
      }

      return true
    }
  }
}
