const DEFAULT_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * 规范化 retry 配置。
 * 支持：
 *   retry: 3                       -> 收到 500 时最多重试 3 次，仅 GET/HEAD/OPTIONS
 *   retry: { times: 3 }            -> 同上
 *   retry: { times: 3, statuses: [500, 502, 503], methods: ['GET', 'POST'] }
 */
function normalizeRetryConfig (retry) {
  if (typeof retry === 'number') {
    return {
      times: Math.max(0, Math.floor(retry)),
      statuses: [500],
      methods: DEFAULT_RETRY_METHODS,
    }
  }

  if (retry && typeof retry === 'object') {
    const statuses = Array.isArray(retry.statuses) && retry.statuses.length > 0
      ? retry.statuses.map(status => Number.parseInt(status, 10)).filter(status => Number.isFinite(status))
      : [500]

    return {
      times: Math.max(0, Math.floor(retry.times ?? retry.retries ?? 0)),
      statuses: statuses.length > 0 ? statuses : [500],
      methods: Array.isArray(retry.methods) && retry.methods.length > 0
        ? retry.methods.map(method => String(method).toUpperCase())
        : DEFAULT_RETRY_METHODS,
    }
  }

  return null
}

module.exports = {
  name: 'retry',
  priority: 100,
  requestIntercept (context, interceptOpt, _req, _res, _ssl, _next) {
    const { rOptions, log } = context

    const retryConfig = normalizeRetryConfig(interceptOpt.retry)
    if (retryConfig && retryConfig.times > 0) {
      context.retryConfig = retryConfig
      const methods = retryConfig.methods.join('/')
      log.info(`retry intercept: hostname: ${rOptions.hostname}, 状态码 [${retryConfig.statuses.join(',')}] 时最多重试 ${retryConfig.times} 次, methods: ${methods}`)
    } else if (retryConfig) {
      log.warn(`retry 配置无效（次数需 > 0）：hostname: ${rOptions.hostname}, retry:`, interceptOpt.retry)
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.retry
  },
}
