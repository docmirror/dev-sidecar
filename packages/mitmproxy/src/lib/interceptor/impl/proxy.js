const url = require('url')
module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
    const proxy = interceptOpt.proxy.indexOf('http') === 0 ? interceptOpt.proxy : rOptions.protocol + '//' + interceptOpt.proxy
    // eslint-disable-next-line node/no-deprecated-api
    const URL = url.parse(proxy)
    rOptions.protocol = URL.protocol
    rOptions.hostname = URL.host
    rOptions.host = URL.host
    rOptions.headers.host = URL.host
    if (URL.port == null) {
      rOptions.port = rOptions.protocol === 'https:' ? 443 : 80
    }

    console.log('proxy:', rOptions.hostname, req.url, interceptOpt.proxy)
  },
  is (interceptOpt) {
    return !!interceptOpt.proxy
  }
}
