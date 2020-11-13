
module.exports = function createIntercept (context) {
  const { log } = context
  return {
    requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
      log.info('abort:', rOptions.hostname, req.url)
      res.writeHead(403)
      res.write('DevSidecar 403: \n\n request abort, this request is matched by abort intercept.\n\n 因配置abort拦截器，本请求将取消')
      res.end()
    },
    is (interceptOpt) {
      return !!interceptOpt.abort
    }
  }
}
