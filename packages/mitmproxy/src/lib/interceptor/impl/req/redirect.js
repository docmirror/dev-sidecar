const proxyApi = require('./proxy')

module.exports = {
  name: 'redirect',
  priority: 105,
  requestIntercept (context, interceptOpt, req, res, ssl, next, matched) {
    const { rOptions, log } = context

    // 获取重定向目标地址
    const redirect = proxyApi.buildTargetUrl(rOptions, interceptOpt.redirect, interceptOpt, matched)

    const headers = {
      'Location': redirect,
      'DS-Interceptor': 'redirect',
    }

    // headers.Access-Control-Allow-*：避免跨域问题
    if (rOptions.headers.origin) {
      headers['Access-Control-Allow-Credentials'] = 'true'
      headers['Access-Control-Allow-Origin'] = rOptions.headers.origin
    }

    res.writeHead(302, headers)
    res.end()

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
    log.info(`redirect intercept: ${url} ➜ ${redirect}`)
    return true // true代表请求结束
  },
  is (interceptOpt) {
    return interceptOpt.redirect // 如果配置中有redirect，那么这个配置是需要redirect拦截的
  },
}
