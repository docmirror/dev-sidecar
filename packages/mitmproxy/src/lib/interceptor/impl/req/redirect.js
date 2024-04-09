module.exports = {
  name: 'redirect',
  priority: 102,
  requestIntercept (context, interceptOpt, req, res, ssl, next, matched) {
    const { rOptions, log } = context

    let redirect
    if (typeof interceptOpt.redirect === 'string') {
      if (interceptOpt.redirect.indexOf('http:') === 0 || interceptOpt.redirect.indexOf('https:') === 0) {
        redirect = interceptOpt.redirect
      } else {
        redirect = rOptions.protocol + '//' + interceptOpt.redirect + req.url
      }
    } else {
      redirect = interceptOpt.redirect(req.url)
    }

    // 替换内容
    if (redirect.indexOf('${') >= 0) {
      // eslint-disable-next-line
      // no-template-curly-in-string
      // eslint-disable-next-line no-template-curly-in-string
      redirect = redirect.replace('${host}', rOptions.hostname)

      if (matched) {
        for (let i = 0; i < matched.length; i++) {
          redirect = redirect.replace('${m[' + i + ']}', matched[i])
        }
      }
    }

    res.writeHead(302, {
      Location: redirect,
      'DS-Interceptor': 'redirect'
    })
    res.end()

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
    log.info(`redirect intercept: ${url} ➜ ${redirect}`)
    return true // true代表请求结束
  },
  is (interceptOpt) {
    return interceptOpt.redirect // 如果配置中有redirect，那么这个配置是需要redirect拦截的
  }
}
