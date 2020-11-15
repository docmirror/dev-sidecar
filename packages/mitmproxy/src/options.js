const interceptors = require('./lib/interceptor')
const dnsUtil = require('./lib/dns')
const lodash = require('lodash')
const log = require('./utils/util.log')
function matchHostname (hostMap, hostname) {
  const value = hostMap[hostname]
  if (value) {
    return value
  }
  if (!value) {
    for (const target in hostMap) {
      if (target.indexOf('*') < 0) {
        continue
      }
      // 正则表达式匹配
      if (hostname.match(target)) {
        return hostMap[target]
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

function domainMapRegexply (hostMap) {
  const regexpMap = {}
  lodash.each(hostMap, (value, domain) => {
    if (domain.indexOf('*') >= 0) {
      const regDomain = domainRegexply(domain)
      regexpMap[regDomain] = value
    } else {
      regexpMap[domain] = value
    }
  })
  return regexpMap
}

module.exports = (config) => {
  const intercepts = domainMapRegexply(config.intercepts)
  const whiteList = domainMapRegexply(config.whiteList)

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
      const inWhiteList = matchHostname(whiteList, hostname) != null
      if (inWhiteList) {
        log.info('白名单域名，不拦截', hostname)
        return false
      }
      return !!matchHostname(intercepts, hostname) // 配置了拦截的域名，将会被代理
    },
    createIntercepts: (rOptions) => {
      const hostname = rOptions.hostname
      const interceptOpts = matchHostname(intercepts, hostname)
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        return
      }

      const matchIntercepts = []
      for (const regexp in interceptOpts) { // 遍历拦截配置
        const interceptOpt = interceptOpts[regexp]
        if (regexp !== true) {
          if (!isMatched(rOptions.path, regexp)) {
            continue
          }
        }
        for (const impl of interceptors) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (impl.is(interceptOpt)) {
            const interceptor = {}
            if (impl.requestIntercept) {
              // req拦截器
              interceptor.requestIntercept = (req, res, ssl) => {
                impl.requestIntercept(interceptOpt, rOptions, req, res, ssl)
              }
            } else if (impl.responseIntercept) {
              // res拦截器
              interceptor.responseIntercept = (req, res, proxyReq, proxyRes, ssl) => {
                impl.responseIntercept(interceptOpt, rOptions, req, res, proxyReq, proxyRes, ssl)
              }
            }
            matchIntercepts.push(interceptor)
          }
        }
      }
      return matchIntercepts
    }
  }
}
