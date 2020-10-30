const interceptors = require('../../lib/interceptor')
const dnsUtil = require('../../lib/dns')
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

// function test () {
//   const ret = domainRegexply('*.aaa.com')
//   console.log(ret)
//   const success = 'aa.aaa.com'.match(ret)
//   console.log(success)
//   const fail = 'a.aaaa.com'.match(ret)
//   console.log(fail)
// }
// test()

module.exports = (config) => {
  let intercepts = lodash.cloneDeep(config.server.intercepts)
  const dnsMapping = lodash.cloneDeep(config.server.dns.mapping)

  if (config.plugin) {
    lodash.each(config.plugin, (value) => {
      const plugin = value
      if (plugin.intercepts) {
        lodash.merge(intercepts, plugin.intercepts)
      }
      if (plugin.dns) {
        lodash.merge(dnsMapping, plugin.dns)
      }
    })
  }

  const regexpIntercepts = {}
  lodash.each(intercepts, (value, domain) => {
    if (domain.indexOf('*') >= 0) {
      const regDomain = domainRegexply(domain)
      regexpIntercepts[regDomain] = value
    } else {
      regexpIntercepts[domain] = value
    }
  })
  intercepts = regexpIntercepts

  const serverConfig = config.server

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

      for (const interceptOpt of interceptOpts) { // 遍历拦截配置
        let regexpList
        if (interceptOpt.regexp != null) {
          if (interceptOpt.regexp instanceof Array) {
            regexpList = interceptOpt.regexp
          } else {
            regexpList = [interceptOpt.regexp]
          }
        } else {
          regexpList = [true]
        }

        for (const regexp of regexpList) { // 遍历regexp配置
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
      }
      next()
    },
    responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
      next()
    }
  }
}
