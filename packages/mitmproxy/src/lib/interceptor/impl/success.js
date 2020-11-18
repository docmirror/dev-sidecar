module.exports = {
  requestIntercept (context, interceptOpts, req, res, ssl, next) {
    const { rOptions, log } = context
    log.info('success:', rOptions.hostname, req.url)
    res.writeHead(200)
    res.write('DevSidecar 200: \n\n request success, this request is matched by success intercept.\n\n 因配置success拦截器，本请求将直接返回成功')
    res.end()
    return true// 是否结束
  },
  is (interceptOpt) {
    return !!interceptOpt.success
  }
}
