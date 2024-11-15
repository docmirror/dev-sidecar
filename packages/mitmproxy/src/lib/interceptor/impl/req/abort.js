module.exports = {
  name: 'abort',
  priority: 103,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'DS-Interceptor': 'abort',
    })
    res.write(
      'DevSidecar 403: Request abort.\n\n'
        + '  This request is matched by abort intercept.\n'
        + '  因配置abort拦截器，本请求直接返回403禁止访问。',
    )
    res.end()

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
    log.info('abort intercept:', url)
    return true // true代表请求结束
  },
  is (interceptOpt) {
    return !!interceptOpt.abort
  },
}
