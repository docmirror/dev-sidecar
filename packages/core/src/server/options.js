const getLogger = require('../lib/utils/logger')
const logger = getLogger('proxy')
const interceptors = require('../lib/interceptor')
const dnsUtil = require('../lib/dns')
function matchHostname (intercepts, hostname) {
  const interceptOpts = intercepts[hostname]
  if (interceptOpts) {
    return interceptOpts
  }
  if (!interceptOpts) { // 该域名没有配置拦截器，直接过
    for (const target in intercepts) {
      if (target.indexOf('*') < 0) {
        continue
      }
      // 正则表达式匹配
      const regexp = target.replace('.', '\\.').replace('*', '.*')
      if (hostname.match(regexp)) {
        return intercepts[target]
      }
    }
  }
}

function isMatched (url, regexp) {
  return url.match(regexp)
}

module.exports = (config) => {
  return {
    port: config.server.port,
    dnsConfig: {
      providers: dnsUtil.initDNS(config.dns.providers), mapping: config.dns.mapping
    },
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      return !!matchHostname(config.intercepts, hostname) // 配置了拦截的域名，将会被代理
    },
    requestInterceptor: (rOptions, req, res, ssl, next) => {
      const hostname = rOptions.hostname
      const interceptOpts = matchHostname(config.intercepts, hostname)
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        next()
        return
      }

      for (const interceptOpt of interceptOpts) { // 遍历拦截配置
        let regexpList
        if(interceptOpt.regexp!=null){
          if (interceptOpt.regexp instanceof Array) {
            regexpList = interceptOpt.regexp
          } else {
            regexpList = [interceptOpt.regexp]
          }
        }else{
          regexpList = [true]
        }



        for (const regexp of regexpList) { // 遍历regexp配置
          if(regexp!==true){
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
              logger.error(err)
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
