const cacheReq = require('../req/cacheReq')

module.exports = {
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions } = context

    // 只有GET请求，且响应码为2xx时才进行缓存
    if (rOptions.method !== 'GET' || proxyRes.statusCode < 200 || proxyRes.statusCode >= 300) {
      return
    }

    // 获取maxAge配置
    let maxAge = cacheReq.getMaxAge(interceptOpt)
    // public 或 private
    const cacheControlType = (interceptOpt.cacheControlType || 'public') + ', '
    // immutable属性
    const cacheImmutable = interceptOpt.cacheImmutable !== false ? ', immutable' : ''

    // 获取原响应头中的cache-control、last-modified、expires
    const originalHeaders = {
      cacheControl: null,
      lastModified: null,
      expires: null,
      etag: null
    }
    for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
      // 尝试修改rawHeaders中的cache-control、last-modified、expires
      if (proxyRes.rawHeaders[i].toLowerCase() === 'cache-control') {
        originalHeaders.cacheControl = { value: proxyRes.rawHeaders[i + 1], valueIndex: i + 1 }
      } else if (proxyRes.rawHeaders[i].toLowerCase() === 'last-modified') {
        originalHeaders.lastModified = { value: proxyRes.rawHeaders[i + 1], valueIndex: i + 1 }
      } else if (proxyRes.rawHeaders[i].toLowerCase() === 'expires') {
        originalHeaders.expires = { value: proxyRes.rawHeaders[i + 1], valueIndex: i + 1 }
      } else if (proxyRes.rawHeaders[i].toLowerCase() === 'etag') {
        originalHeaders.etag = { value: proxyRes.rawHeaders[i + 1], valueIndex: i + 1 }
      }

      // 如果已经设置了cache-control、last-modified、expires，则直接break
      if (originalHeaders.cacheControl && originalHeaders.lastModified && originalHeaders.expires && originalHeaders.etag) {
        break
      }
    }

    // 判断原max-age是否大于新max-age
    if (originalHeaders.cacheControl) {
      const maxAgeMatch = originalHeaders.cacheControl.value.match(/max-age=(\d+)/)
      if (maxAgeMatch && maxAgeMatch[1] > maxAge) {
        if (interceptOpt.cacheImmutable !== false && originalHeaders.cacheControl.value.indexOf('immutable') < 0) {
          maxAge = maxAgeMatch[1]
        } else {
          return
        }
      }
    }

    // 替换用的头信息
    const now = new Date()
    const replaceHeaders = {
      cacheControl: `${cacheControlType}max-age=${maxAge + 1}${cacheImmutable}`,
      lastModified: now.toUTCString(),
      expires: new Date(now.getTime() + maxAge * 1000).toUTCString()
    }
    // 开始替换
    // 替换cache-control
    if (originalHeaders.cacheControl) {
      proxyRes.rawHeaders[originalHeaders.cacheControl.valueIndex] = replaceHeaders.cacheControl
    } else {
      res.setHeader('Cache-Control', replaceHeaders.cacheControl)
    }
    // 替换last-modified
    if (originalHeaders.lastModified) {
      proxyRes.rawHeaders[originalHeaders.lastModified.valueIndex] = replaceHeaders.lastModified
    } else {
      res.setHeader('Last-Modified', replaceHeaders.lastModified)
    }
    // 替换expires
    if (originalHeaders.expires) {
      proxyRes.rawHeaders[originalHeaders.expires.valueIndex] = replaceHeaders.expires
    } else {
      res.setHeader('Expires', replaceHeaders.expires)
    }

    res.setHeader('Dev-Sidecar-Cache-Response-Interceptor', 'cacheRes:maxAge=' + maxAge)
  },
  is (interceptOpt) {
    const maxAge = cacheReq.getMaxAge(interceptOpt)
    return maxAge != null && maxAge > 0
  }
}
