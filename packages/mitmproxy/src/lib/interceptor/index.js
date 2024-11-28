// request interceptor impls
const OPTIONS = require('./impl/req/OPTIONS.js')

const success = require('./impl/req/success')
const redirect = require('./impl/req/redirect')
const abort = require('./impl/req/abort')
const cacheReq = require('./impl/req/cacheReq')

const requestReplace = require('./impl/req/requestReplace')

const proxy = require('./impl/req/proxy')
const sni = require('./impl/req/sni')
const unVerifySsl = require('./impl/req/unVerifySsl')

const baiduOcr = require('./impl/req/baiduOcr')

// response interceptor impls
const AfterOPTIONSHeaders = require('./impl/res/AfterOPTIONSHeaders')
const cacheRes = require('./impl/res/cacheRes')
const responseReplace = require('./impl/res/responseReplace')

const script = require('./impl/res/script')

module.exports = [
  // request interceptor impls
  OPTIONS,
  success, redirect, abort, cacheReq,
  requestReplace,
  proxy, sni, unVerifySsl,
  baiduOcr,

  // response interceptor impls
  AfterOPTIONSHeaders, cacheRes, responseReplace,
  script,
]
