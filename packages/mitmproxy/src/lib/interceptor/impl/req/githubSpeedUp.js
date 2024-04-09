module.exports = {
  name: 'githubSpeedUp',
  priority: 104,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    // 目前，只拦截github.com，后续可以继续拦截其他域名，做一些特殊处理
    if (rOptions.hostname !== 'github.com') {
      return
    }

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`

    // 判断是否为仓库内的图片文件
    const matched = req.url.match('^(/[^/]+){2}/raw(/[^/]+)+\\.(jpg|jpeg|png|gif)(\\?.*)?$')
    if (matched) {
      const redirect = 'https://raw.githubusercontent.com' + matched[0].replace('/raw/', '/')

      res.writeHead(302, {
        Location: redirect,
        'DS-Interceptor': 'githubSpeedUp'
      })
      res.end()

      log.info('githubSpeedUp intercept:', url)

      return true
    }

    return true // true代表请求结束
  },
  is (interceptOpt) {
    return true
  }
}
