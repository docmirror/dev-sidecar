const responseReplaceApi = require('./responseReplace')

module.exports = {
  name: 'AfterOPTIONSHeaders',
  desc: '开启了options.js功能时，正常请求时，会需要增加响应头 `Access-Control-Allow-Origin: xxx`',
  priority: 201,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log } = context

    if (rOptions.method === 'OPTIONS' || !rOptions.headers.origin) {
      return
    }

    // 合并 Vary 头：如果原始响应已有 Vary，追加 Origin；否则直接设置 Origin
    let varyValue = 'Origin'
    for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
      if (proxyRes.rawHeaders[i].toLowerCase() === 'vary') {
        const existing = proxyRes.rawHeaders[i + 1]
        if (existing && !existing.split(/\s*,\s*/).includes('Origin')) {
          varyValue = `${existing}, Origin`
        } else {
          varyValue = existing // 已包含 Origin，无需修改
        }
        break
      }
    }

    const headers = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': rOptions.headers.origin,
      'Cross-Origin-Resource-Policy': interceptOpt.optionsCrossPolicy || 'cross-origin',
      // 当 Access-Control-Allow-Origin 是特定值时，应设置 Vary: Origin
      // 防止不同 Origin 的请求使用相同的缓存响应
      'Vary': varyValue,
    }

    // 替换响应头
    if (responseReplaceApi.replaceResponseHeaders({ ...headers }, res, proxyRes)) {
      log.info('AfterOPTIONSHeaders intercept:', JSON.stringify(headers))
      res.setHeader('DS-AfterOPTIONSHeaders-Interceptor', '1')
    } else {
      res.setHeader('DS-AfterOPTIONSHeaders-Interceptor', '0')
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.options
  },
}
