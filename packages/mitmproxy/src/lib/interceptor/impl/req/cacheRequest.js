// 提前编译，避免在 getLastModifiedTimeFromIfModifiedSince 中重复创建 RegExp 对象
const PURE_NUMBER_RE = /^\s*\d+\s*$/

function getMaxAge (interceptOpt) {
  // 秒
  if (interceptOpt.cacheSeconds > 0 || interceptOpt.cacheMaxAge > 0 || interceptOpt.cache > 0) {
    return interceptOpt.cacheSeconds || interceptOpt.cacheMaxAge || interceptOpt.cache
  }
  // 分钟
  if (interceptOpt.cacheMinutes > 0) {
    return interceptOpt.cacheMinutes * 60 // 60：1分钟
  }
  // 小时
  if (interceptOpt.cacheHours > 0) {
    return interceptOpt.cacheHours * 3600 // 60 * 60 一小时
  }
  // 天
  if (interceptOpt.cacheDays > 0) {
    return interceptOpt.cacheDays * 86400 // 60 * 60 * 24 一天
  }
  // 星期
  if (interceptOpt.cacheWeeks > 0) {
    return interceptOpt.cacheWeeks * 604800 // 60 * 60 * 24 * 7 一周
  }
  // 月
  if (interceptOpt.cacheMonths > 0) {
    return interceptOpt.cacheMonths * 2592000 // 60 * 60 * 24 * 30 一个月
  }
  // 年
  if (interceptOpt.cacheYears > 0) {
    return interceptOpt.cacheYears * 31536000 // 60 * 60 * 24 * 365 一年
  }

  return null
}

// 获取 lastModifiedTime 的方法
function getLastModifiedTimeFromIfModifiedSince (rOptions, log) {
  // 获取 If-Modified-Since 用于判断是否命中缓存
  const lastModified = rOptions.headers['if-modified-since']
  if (lastModified == null || lastModified.length === 0) {
    return null // 没有lastModified，返回null
  }

  // 优先尝试作为纯数字时间戳（毫秒）解析，避免 new Date() 将其当作无效日期而返回 NaN
  if (PURE_NUMBER_RE.test(lastModified)) {
    return Number.parseInt(lastModified, 10)
  }

  // 再尝试作为日期字符串解析
  const time = new Date(lastModified).getTime()
  if (Number.isNaN(time)) {
    log.warn(`cache intercept: 解析 if-modified-since 失败: '${lastModified}'`)
    return null
  }

  return time
}

module.exports = {
  name: 'cacheRequest',
  priority: 104,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    if (rOptions.method !== 'GET') {
      return // 非GET请求，不拦截
    }

    // 获取 Cache-Control 用于判断是否禁用缓存
    const cacheControl = rOptions.headers['cache-control']
    if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
      return // 当前请求指定要禁用缓存，跳过当前拦截器
    }
    // 获取 Pragma 用于判断是否禁用缓存
    const pragma = rOptions.headers.pragma
    if (pragma && (pragma.includes('no-cache') || pragma.includes('no-store'))) {
      return // 当前请求指定要禁用缓存，跳过当前拦截器
    }

    // 最近编辑时间
    const lastModifiedTime = getLastModifiedTimeFromIfModifiedSince(rOptions, log)
    if (lastModifiedTime == null) {
      return // 没有 lastModified，不拦截
    }

    // 获取maxAge配置
    const maxAge = getMaxAge(interceptOpt)
    // 判断缓存是否已过期
    const passTime = Date.now() - lastModifiedTime
    if (passTime > maxAge * 1000) {
      return // 缓存已过期，不拦截
    }

    // 缓存未过期，直接拦截请求并响应304
    res.writeHead(304, {
      'DS-Interceptor': `cache: ${maxAge}`,
    })
    res.end()

    const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
    log.info('cache intercept:', url)
    return true
  },
  is (interceptOpt) {
    const maxAge = getMaxAge(interceptOpt)
    return maxAge != null && maxAge > 0
  },
  getMaxAge,
}
