const abort = require('./impl/req/abort')

const baiduOcr = require('./impl/req/baiduOcr')
const cacheReq = require('./impl/req/cacheReq')
// request interceptor impls
const OPTIONS = require('./impl/req/OPTIONS.js')
const proxy = require('./impl/req/proxy')

const redirect = require('./impl/req/redirect')

const requestReplace = require('./impl/req/requestReplace')
const sni = require('./impl/req/sni')

const success = require('./impl/req/success')

// response interceptor impls
const OPTIONSHeaders = require('./impl/res/AfterOPTIONSHeaders')
const cacheRes = require('./impl/res/cacheRes')
const responseReplace = require('./impl/res/responseReplace')

const script = require('./impl/res/script')

module.exports = [
  // request interceptor impls
  OPTIONS,
  success,
  redirect,
  abort,
  cacheReq,
  requestReplace,
  proxy,
  sni,
  baiduOcr,

  // response interceptor impls
  OPTIONSHeaders,
  cacheRes,
  responseReplace,
  script,
]
