const responseReplace = require('../../../../../src/lib/interceptor/impl/res/responseReplace')

const headers = {}
const res = {
  setHeader: (key, value) => {
    headers[key] = value
  },
}

const proxyRes = {
  rawHeaders: [
    'Content-Type', 'application/json; charset=utf-8',
    'Content-Length', '2',
    'ETag', 'W/"2"',
    'Date', 'Thu, 01 Jan 1970 00:00:00 GMT',
    'Connection', 'keep-alive',
  ],
}

const newHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Length': '3',
  'xxx': 1,
  'Date': '[remove]',
  'yyy': '[remove]',
}

const result = responseReplace.replaceResponseHeaders(newHeaders, res, proxyRes)
console.log(proxyRes.rawHeaders)
console.log(headers)
console.log(result)
