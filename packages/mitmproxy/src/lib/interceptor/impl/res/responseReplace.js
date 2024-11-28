const lodash = require('lodash')
const cacheReq = require('../req/cacheReq')

const REMOVE = '[remove]'

// 替换响应头
function replaceResponseHeaders (newHeaders, res, proxyRes) {
  if (!newHeaders || lodash.isEmpty(newHeaders)) {
    return null
  }

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
  const needDeleteKeys = []
  for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
    const headerKey = proxyRes.rawHeaders[i].toLowerCase()

    const newHeaderValue = newHeaders[headerKey]
    if (newHeaderValue) {
      if (newHeaderValue !== proxyRes.rawHeaders[i + 1]) {
        preHeaders[headerKey] = proxyRes.rawHeaders[i + 1] // 先保存原先响应头
        if (newHeaderValue === REMOVE) { // 由于拦截配置中不允许配置null，会被删，所以配置一个 "[remove]"，当作删除响应头的意思
          proxyRes.rawHeaders[i + 1] = ''
        } else {
          proxyRes.rawHeaders[i + 1] = newHeaderValue
        }
      }
      needDeleteKeys.push(headerKey)
    }
  }
  // 处理删除响应头
  for (const headerKey of needDeleteKeys) {
    delete newHeaders[headerKey]
  }
  // 新增响应头
  for (const headerKey in newHeaders) {
    const headerValue = newHeaders[headerKey]
    if (headerValue == null || headerValue === REMOVE) {
      continue
    }

    res.setHeader(headerKey, newHeaders[headerKey])
    preHeaders[headerKey] = null // 标记原先响应头为null
  }

  if (lodash.isEmpty(preHeaders)) {
    return null
  }
  // 返回原先响应头
  return preHeaders
}

module.exports = {
  name: 'responseReplace',
  priority: 203,
  replaceResponseHeaders,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log } = context

    if (proxyRes.statusCode !== 200) {
      return
    }

    const responseReplaceConfig = interceptOpt.responseReplace

    let actions = ''

    const replaceHeaders = responseReplaceConfig.headers || {}

    // 处理文件下载请求
    if (responseReplaceConfig.doDownload || rOptions.doDownload) {
      const filename = (rOptions.path.match('^.*/([^/?]+)/?(\\?.*)?$') || [])[1] || 'UNKNOWN_FILENAME'
      // 设置文件下载响应头
      replaceHeaders['content-disposition'] = `attachment; filename="${encodeURIComponent(filename)}"`
      // 设置文件类型
      if (replaceHeaders['content-type'] == null) {
        replaceHeaders['content-type'] = 'application/octet-stream'
      }
      // 如果未手动配置需要缓存，则不允许使用缓存
      const maxAge = cacheReq.getMaxAge(interceptOpt)
      if (maxAge == null || maxAge <= 0) {
        replaceHeaders['cache-control'] = '[remove]'
        replaceHeaders['last-modified'] = '[remove]'
        replaceHeaders.expires = '[remove]'
      }

      actions += `${actions ? ',' : ''}download:${filename}`
    }

    // 替换响应头
    if (replaceResponseHeaders(replaceHeaders, res, proxyRes)) {
      actions += `${actions ? ',' : ''}headers`
    }

    if (actions) {
      res.setHeader('DS-ResponseReplace-Interceptor', actions)
      log.info(`response intercept: ${actions}`)
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.responseReplace
  },
}
