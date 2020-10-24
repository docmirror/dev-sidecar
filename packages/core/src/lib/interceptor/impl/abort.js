const url = require('url')
module.exports = {
  requestInterceptor (interceptOpt, rOptions, req, res, ssl) {
    req.abort()
    console.log('abort:', rOptions.hostname, req.url)
  },
  is (interceptOpt) {
    return !!interceptOpt.abort
  }
}
