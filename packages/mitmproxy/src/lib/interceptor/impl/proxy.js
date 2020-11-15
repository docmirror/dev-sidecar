const url = require('url')
module.exports = function createInterceptor (context) {
  const { log } = context
  return {
    requestIntercept (interceptOpt, rOptions, req, res, ssl, next) {
      let proxyTarget = interceptOpt.proxy + req.url
      if (interceptOpt.replace) {
        const regexp = new RegExp(interceptOpt.replace)
        proxyTarget = req.url.replace(regexp, interceptOpt.proxy)
      }
      log.info('proxy', rOptions.path, rOptions.url)
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

      log.info('proxy:', rOptions.hostname, req.url, proxyTarget)
    },
    is (interceptOpt) {
      return !!interceptOpt.proxy
    }
  }
}
