const interceptors = require('./lib/interceptor')
const dnsUtil = require('./lib/dns')
const lodash = require('lodash')
function matchHostname (intercepts, hostname) {
  const interceptOpts = intercepts[hostname]
  if (interceptOpts) {
    return interceptOpts
  }
  if (!interceptOpts) {
    for (const target in intercepts) {
      if (target.indexOf('*') < 0) {
        continue
      }
      // 正则表达式匹配
      if (hostname.match(target)) {
        return intercepts[target]
      }
    }
  }
}

function isMatched (url, regexp) {
  return url.match(regexp)
}

function domainRegexply (target) {
  return target.replace(/\./g, '\\.').replace(/\*/g, '.*')
}

module.exports = (config) => {
  const regexpIntercepts = {}
  lodash.each(config.intercepts, (value, domain) => {
    if (domain.indexOf('*') >= 0) {
      const regDomain = domainRegexply(domain)
      regexpIntercepts[regDomain] = value
    } else {
      regexpIntercepts[domain] = value
    }
  })

  const intercepts = regexpIntercepts
  const dnsMapping = config.dns.mapping
  const serverConfig = config

  return {
    port: serverConfig.port,
    dnsConfig: {
      providers: dnsUtil.initDNS(serverConfig.dns.providers),
      mapping: dnsMapping
    },
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      return !!matchHostname(intercepts, hostname) // 配置了拦截的域名，将会被代理
    },
    requestInterceptor: (rOptions, req, res, ssl, next) => {
      const hostname = rOptions.hostname
      const interceptOpts = matchHostname(intercepts, hostname)
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        next()
        return
      }

      for (const regexp in interceptOpts) { // 遍历拦截配置
        const interceptOpt = interceptOpts[regexp]
        if (regexp !== true) {
          if (!isMatched(req.url, regexp)) {
            continue
          }
        }
        for (const interceptImpl of interceptors) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (!interceptImpl.is(interceptOpt) && interceptImpl.requestInterceptor) {
            continue
          }
          try {
            const result = interceptImpl.requestInterceptor(interceptOpt, rOptions, req, res, ssl)
            if (result) { // 拦截成功,其他拦截器就不处理了
              return
            }
          } catch (err) {
            // 拦截失败
            console.error(err)
          }
        }
      }
      next()
    },
    responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
      next()
    }
  }
}
