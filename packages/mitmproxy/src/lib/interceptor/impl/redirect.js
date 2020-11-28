module.exports = {
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context
    const url = req.url
    let redirect
    if (typeof interceptOpt.redirect === 'string') {
      redirect = rOptions.protocol + '//' + interceptOpt.redirect + url
    } else {
      redirect = interceptOpt.redirect(url)
    }
    log.info('请求重定向：', rOptions.hostname, url, redirect)
    res.writeHead(302, { Location: redirect })
    res.end()
    return true// 是否结束
  },
  is (interceptOpt) {
    return interceptOpt.redirect // 如果配置中有redirect，那么这个配置是需要redirect拦截的
  }
}
