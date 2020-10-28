module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
    console.log('abort:', rOptions.hostname, req.url)
    req.destroy()
  },
  is (interceptOpt) {
    return !!interceptOpt.abort
  }
}
