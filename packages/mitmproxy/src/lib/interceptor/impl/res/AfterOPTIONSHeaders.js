const responseReplaceApi = require('./responseReplace')

module.exports = {
  name: 'OPTIONSHeaders',
  desc: '开启了options.js功能时，正常请求时，会需要增加响应头 `Access-Control-Allow-Origin: xxx`',
  priority: 201,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log } = context

    if (rOptions.method === 'OPTIONS') {
      return
    }

    const headers = {
      'Access-Control-Allow-Origin': rOptions.headers.origin
    }

    // 替换响应头
    if (responseReplaceApi.replaceResponseHeaders({ ...headers }, res, proxyRes)) {
      res.setHeader('DS-AfterOPTIONSHeaders-Interceptor', rOptions.headers.origin)
      log.info('AfterOPTIONSHeaders intercept:', JSON.stringify(headers))
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.options
  }
}
