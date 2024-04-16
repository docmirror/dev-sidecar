const lodash = require('lodash')

function replaceHeaders (newHeaders, res, proxyRes) {
  if (newHeaders && !lodash.isEmpty(newHeaders)) {
    // 响应头Key统一转小写
    for (const headerKey in newHeaders) {
      if (headerKey === headerKey.toLowerCase()) {
        continue
      }

      const value = newHeaders[headerKey]
      delete newHeaders[headerKey]
      newHeaders[headerKey.toLowerCase()] = value
    }

    // 原先响应头
    const preHeaders = {}

    // 替换响应头
    for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
      const headerKey = proxyRes.rawHeaders[i]
      const headerKeyLower = headerKey.toLowerCase()

      const newHeaderValue = newHeaders[headerKeyLower]
      if (newHeaderValue && newHeaderValue !== proxyRes.rawHeaders[i + 1]) {
        preHeaders[headerKeyLower] = proxyRes.rawHeaders[i + 1] // 先保存原先响应头
        proxyRes.rawHeaders[i + 1] = newHeaderValue === '[remove]' ? '' : newHeaderValue // 由于拦截配置中不允许配置null，会被删，所以配置一个[remove]，当作删除响应头的意思
        delete newHeaders[headerKeyLower]
      }
    }
    // 新增响应头
    for (const headerKey in newHeaders) {
      res.setHeader(headerKey, newHeaders[headerKey])
      preHeaders[headerKey] = null // 标记原先响应头为null
    }

    // 返回原先响应头
    return preHeaders
  }

  return null
}

module.exports = {
  name: 'responseReplace',
  priority: 203,
  replaceHeaders,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { log } = context

    if (proxyRes.statusCode !== 200) {
      return
    }

    const responseConfig = interceptOpt.response

    let actions = ''

    // 替换响应头
    if (replaceHeaders(responseConfig.headers, res, proxyRes)) {
      actions += 'headers'
    }

    if (actions) {
      res.setHeader('DS-Response-Interceptor', actions)
      log.info('response intercept: ' + actions)
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.response
  }
}
