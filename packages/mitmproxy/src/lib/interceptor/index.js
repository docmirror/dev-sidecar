// request interceptor impls
const OPTIONS = require('./impl/req/OPTIONS.js')
const success = require('./impl/req/success')
const abort = require('./impl/req/abort')
const cacheRequest = require('./impl/req/cacheRequest')
const redirect = require('./impl/req/redirect')

const requestReplace = require('./impl/req/requestReplace')

const proxy = require('./impl/req/proxy')
const sni = require('./impl/req/sni')
const unVerifySsl = require('./impl/req/unVerifySsl')

const baiduOcr = require('./impl/req/baiduOcr')

// response interceptor impls
const AfterOPTIONSHeaders = require('./impl/res/AfterOPTIONSHeaders')
const cacheResponse = require('./impl/res/cacheResponse')
const responseReplace = require('./impl/res/responseReplace')

const script = require('./impl/res/script')

module.exports = [
  // request interceptor impls
  OPTIONS,
  success,
  abort,
  cacheRequest,
  redirect,
  requestReplace,
  proxy,
  sni,
  unVerifySsl,
  baiduOcr,

  // response interceptor impls
  AfterOPTIONSHeaders,
  cacheResponse,
  responseReplace,
  script,
]
