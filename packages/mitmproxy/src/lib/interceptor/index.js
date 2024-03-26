// request interceptor impls
const success = require('./impl/req/success')
const redirect = require('./impl/req/redirect')
const abort = require('./impl/req/abort')

const cacheReq = require('./impl/req/cacheReq')

const proxy = require('./impl/req/proxy')
const sni = require('./impl/req/sni')

// response interceptor impls
const cacheRes = require('./impl/res/cacheRes')
const script = require('./impl/res/script')

module.exports = [
  // request interceptor impls
  success, redirect, abort,
  cacheReq,
  proxy, sni,

  // response interceptor impls
  cacheRes, script
]
