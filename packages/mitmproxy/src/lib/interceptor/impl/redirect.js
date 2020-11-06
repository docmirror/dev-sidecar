module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
    const url = req.url
    let redirect
    if (typeof interceptOpt.redirect === 'string') {
      redirect = rOptions.protocol + '//' + interceptOpt.redirect + url
    } else {
      redirect = interceptOpt.redirect(url)
    }
    console.log('请求重定向：', rOptions.hostname, url, redirect)
    res.writeHead(302, { Location: redirect })
    res.end()
    return true
  },
  is (interceptOpt) {
    return interceptOpt.redirect // 如果配置中有redirect，那么这个配置是需要redirect拦截的
  }
}
