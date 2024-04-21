// request interceptor impls
const OPTIONS = require('./impl/req/OPTIONS.js')

const success = require('./impl/req/success')
const redirect = require('./impl/req/redirect')
const abort = require('./impl/req/abort')
const cacheReq = require('./impl/req/cacheReq')

const requestReplace = require('./impl/req/requestReplace')

const proxy = require('./impl/req/proxy')
const sni = require('./impl/req/sni')

// response interceptor impls
const OPTIONSHeaders = require('./impl/res/AfterOPTIONSHeaders')
const cacheRes = require('./impl/res/cacheRes')
const responseReplace = require('./impl/res/responseReplace')

const script = require('./impl/res/script')

module.exports = [
  // request interceptor impls
  OPTIONS,
  success, redirect, abort, cacheReq,
  requestReplace,
  proxy, sni,

  // response interceptor impls
  OPTIONSHeaders, cacheRes, responseReplace,
  script
]
