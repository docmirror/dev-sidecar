const defaultAllowHeaders = '*'
const defaultAllowMethods = 'GET,POST,PUT,DELETE,HEAD,OPTIONS,PATCH' // CONNECT、TRACE被认为是不安全的请求，通常不建议允许跨域

function readConfig (config, defaultConfig) {
  if (config) {
    if (Object.isArray(config)) {
      config = config.join(',')
    }
  } else {
    config = defaultConfig
  }
  return config
}

module.exports = {
  name: 'options',
  priority: 1,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    // 不是 OPTIONS 请求，或请求头中不含 origin 时，跳过当前拦截器
    if (rOptions.method !== 'OPTIONS' || rOptions.headers.origin == null) {
      return
    }

    // 从请求头中获取跨域相关信息；如果不存在，则从配置中获取的值；如果还不存在，则使用默认值
    const allowHeaders = rOptions.headers['access-control-request-headers'] || readConfig(interceptOpt.optionsAllowHeaders, defaultAllowHeaders)
    const allowMethods = rOptions.headers['access-control-request-method'] || readConfig(interceptOpt.optionsAllowMethods, defaultAllowMethods)

    const headers = {
      // 允许跨域
      'DS-Interceptor': 'options',
      'Access-Control-Allow-Origin': rOptions.headers.origin,
      'Access-Control-Allow-Headers': allowHeaders,
      'Access-Control-Allow-Methods': allowMethods,
      'Access-Control-Max-Age': interceptOpt.optionsMaxAge > 0 ? interceptOpt.optionsMaxAge : 2592000, // 默认有效一个月
      Date: new Date().toUTCString()
    }

    // 判断是否允许
    if (interceptOpt.optionsCredentials !== false && interceptOpt.optionsCredentials !== 'false') {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    res.writeHead(200, headers)
    res.end()

    log.info('options intercept:', (rOptions.original || rOptions).url)
    return true // true代表请求结束
  },
  is (interceptOpt) {
    return !!interceptOpt.options
  }
}
