const url = require('url')
module.exports = {
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log, RequestCounter } = context

    let proxyConf = interceptOpt.proxy
    if (RequestCounter && interceptOpt.backup && interceptOpt.backup.length > 0) {
      // 优选逻辑
      const backup = [proxyConf]
      for (const bk of interceptOpt.backup) {
        backup.push(bk)
      }
      const key = rOptions.hostname + '/' + interceptOpt.key
      const count = RequestCounter.getOrCreate(key, backup)
      if (count.value == null) {
        count.doRank()
      }
      if (count.value == null) {
        log.error('count value is null', count)
      } else {
        count.doCount(count.value)
        proxyConf = count.value
        context.requestCount = {
          key,
          value: count.value,
          count
        }
      }
    }

    let uri = req.url
    if (uri.indexOf('http') === 0) {
      // eslint-disable-next-line node/no-deprecated-api
      const URL = url.parse(uri)
      uri = URL.path
    }
    let proxyTarget = proxyConf + uri
    if (interceptOpt.replace) {
      const regexp = new RegExp(interceptOpt.replace)
      proxyTarget = req.url.replace(regexp, proxyConf)
    }
    // eslint-disable-next-line
    // no-template-curly-in-string
    // eslint-disable-next-line no-template-curly-in-string
    proxyTarget = proxyTarget.replace('${host}', rOptions.hostname)

    log.info('拦截【proxy】： original：', rOptions.hostname, '，target：', proxyTarget)
    // const backup = interceptOpt.backup
    const proxy = proxyTarget.indexOf('http') === 0 ? proxyTarget : rOptions.protocol + '//' + proxyTarget
    // eslint-disable-next-line node/no-deprecated-api
    const URL = url.parse(proxy)
    rOptions.protocol = URL.protocol
    rOptions.hostname = URL.host
    rOptions.host = URL.host
    rOptions.headers.host = URL.host
    rOptions.path = URL.path
    if (URL.port == null) {
      rOptions.port = rOptions.protocol === 'https:' ? 443 : 80
    }

    if (context.requestCount) {
      log.info('proxy choice:', JSON.stringify(context.requestCount))
    }

    if (interceptOpt.sni != null) {
      rOptions.servername = interceptOpt.sni
      rOptions.agent.options.rejectUnauthorized = false
    }
    return true
  },
  is (interceptOpt) {
    return !!interceptOpt.proxy
  }
}
