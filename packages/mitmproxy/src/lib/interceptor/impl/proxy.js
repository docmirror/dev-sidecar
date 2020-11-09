const url = require('url')
module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl, next) {
    const proxyTarget = interceptOpt.proxy
    // const backup = interceptOpt.backup
    const proxy = proxyTarget.indexOf('http') === 0 ? proxyTarget : rOptions.protocol + '//' + proxyTarget
    // eslint-disable-next-line node/no-deprecated-api
    const URL = url.parse(proxy)
    rOptions.protocol = URL.protocol
    rOptions.hostname = URL.host
    rOptions.host = URL.host
    rOptions.headers.host = URL.host
    if (URL.port == null) {
      rOptions.port = rOptions.protocol === 'https:' ? 443 : 80
    }

    console.log('proxy:', rOptions.hostname, req.url, proxyTarget)
  },
  is (interceptOpt) {
    return !!interceptOpt.proxy
  }
}
