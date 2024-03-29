module.exports = {
  name: 'success',
  priority: 101,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'DS-Interceptor': 'success'
    })
    res.write(
      'DevSidecar 200: Request success.\n\n' +
      '  This request is matched by success intercept.\n\n' +
      '  因配置success拦截器，本请求直接返回200成功。'
    )
    res.end()

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
    log.info('success intercept:', url)
    return true // true代表请求结束
  },
  is (interceptOpt) {
    return !!interceptOpt.success
  }
}
