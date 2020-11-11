module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
    console.log('abort:', rOptions.hostname, req.url)
    res.writeHead(403)
    res.write('DevSidecar 403: \n\n request abort, this request is matched by abort intercept.\n\n 因配置abort拦截器，本请求将取消')
    res.end()
  },
  is (interceptOpt) {
    return !!interceptOpt.abort
  }
}
