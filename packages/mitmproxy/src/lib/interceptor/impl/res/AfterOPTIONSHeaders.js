const responseReplaceApi = require('./responseReplace')

module.exports = {
  name: 'AfterOPTIONSHeaders',
  desc: '开启了options.js功能时，正常请求时，会需要增加响应头 `Access-Control-Allow-Origin: xxx`',
  priority: 201,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log } = context

    if (rOptions.method === 'OPTIONS' || rOptions.headers.origin == null) {
      return
    }

    const headers = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': rOptions.headers.origin,
    }

    res.setHeader('DS-AfterOPTIONSHeaders-Interceptor', '1')

    // 替换响应头
    if (responseReplaceApi.replaceResponseHeaders({ ...headers }, res, proxyRes)) {
      log.info('AfterOPTIONSHeaders intercept:', JSON.stringify(headers))
    } else {
      res.setHeader('DS-AfterOPTIONSHeaders-Interceptor', '0')
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.options
  },
}
