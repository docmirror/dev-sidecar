const url = require('url')
const lodash = require('lodash')
module.exports = {
  name: 'proxy',
  priority: 121,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log, RequestCounter } = context

    const originHostname = rOptions.hostname

    let proxyConf = interceptOpt.proxy
    if (RequestCounter && interceptOpt.backup && interceptOpt.backup.length > 0) {
      // 优选逻辑
      const backupList = [proxyConf]
      for (const bk of interceptOpt.backup) {
        backupList.push(bk)
      }
      const key = rOptions.hostname + '/' + interceptOpt.key
      const count = RequestCounter.getOrCreate(key, backupList)
      if (count.value == null) {
        count.doRank()
      }
      if (count.value == null) {
        log.error('`count.value` is null, the count:', count)
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

    // 获取代理目标地址
    let proxyTarget
    if (interceptOpt.replace) {
      const regexp = new RegExp(interceptOpt.replace)
      proxyTarget = req.url.replace(regexp, proxyConf)
    } else if (proxyConf.indexOf('http:') === 0 || proxyConf.indexOf('https:') === 0) {
      proxyTarget = proxyConf
    } else {
      let uri = req.url
      if (uri.indexOf('http') === 0) {
        // eslint-disable-next-line node/no-deprecated-api
        const URL = url.parse(uri)
        uri = URL.path
      }
      proxyTarget = proxyConf + uri
    }

    // eslint-disable-next-line
    // no-template-curly-in-string
    // eslint-disable-next-line no-template-curly-in-string
    proxyTarget = proxyTarget.replace('${host}', rOptions.hostname)

    const proxy = proxyTarget.indexOf('http') === 0 ? proxyTarget : rOptions.protocol + '//' + proxyTarget
    // eslint-disable-next-line node/no-deprecated-api
    const URL = url.parse(proxy)
    rOptions.origional = lodash.cloneDeep(rOptions) // 备份原始请求参数
    delete rOptions.origional.agent
    delete rOptions.origional.headers
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
      if (rOptions.agent && rOptions.agent.options) {
        rOptions.agent.options.rejectUnauthorized = false
      }
      res.setHeader('DS-Interceptor', `proxy: ${proxyTarget}, sni: ${interceptOpt.sni}`)
      log.info('proxy intercept: hostname:', originHostname, ', target：', proxyTarget, ', sni replace servername:', rOptions.servername)
    } else {
      res.setHeader('DS-Interceptor', `proxy: ${proxyTarget}`)
      log.info('proxy intercept: hostname:', originHostname, ', target：', proxyTarget)
    }

    return true
  },
  is (interceptOpt) {
    return !!interceptOpt.proxy
  }
}
