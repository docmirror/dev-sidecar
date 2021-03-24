const interceptors = require('./lib/interceptor')
const dnsUtil = require('./lib/dns')
const log = require('./utils/util.log')
const matchUtil = require('./utils/util.match')
const createOverwallMiddleware = require('./lib/proxy/middleware/overwall')

module.exports = (config) => {
  const intercepts = matchUtil.domainMapRegexply(config.intercepts)
  const whiteList = matchUtil.domainMapRegexply(config.whiteList)

  const dnsMapping = config.dns.mapping
  const serverConfig = config
  const setting = serverConfig.setting

  const overwallMiddleware = createOverwallMiddleware(serverConfig.plugin.overwall)
  const middlewares = []
  if (overwallMiddleware) {
    middlewares.push(overwallMiddleware)
  }
  const options = {
    port: serverConfig.port,
    dnsConfig: {
      providers: dnsUtil.initDNS(serverConfig.dns.providers),
      mapping: dnsMapping,
      speedTest: config.dns.speedTest
    },
    setting,
    middlewares,
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      const inWhiteList = matchUtil.matchHostname(whiteList, hostname) != null
      if (inWhiteList) {
        log.info('白名单域名，不拦截', hostname)
        return false
      }
      // 配置了拦截的域名，将会被代理
      return !!matchUtil.matchHostname(intercepts, hostname)
    },
    createIntercepts: (context) => {
      const rOptions = context.rOptions
      const hostname = rOptions.hostname
      const interceptOpts = matchUtil.matchHostname(intercepts, hostname)
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        return
      }

      const matchIntercepts = []
      for (const regexp in interceptOpts) { // 遍历拦截配置
        const interceptOpt = interceptOpts[regexp]
        interceptOpt.key = regexp
        if (regexp !== true) {
          if (!matchUtil.isMatched(rOptions.path, regexp)) {
            continue
          }
        }
        for (const impl of interceptors) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (impl.is && impl.is(interceptOpt)) {
            const interceptor = {}
            if (impl.requestIntercept) {
              // req拦截器
              interceptor.requestIntercept = (context, req, res, ssl, next) => {
                return impl.requestIntercept(context, interceptOpt, req, res, ssl, next)
              }
            } else if (impl.responseIntercept) {
              // res拦截器
              interceptor.responseIntercept = (context, req, res, proxyReq, proxyRes, ssl, next) => {
                return impl.responseIntercept(context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next)
              }
            }
            matchIntercepts.push(interceptor)
          }
        }
      }
      return matchIntercepts
    }
  }

  if (setting.rootCaFile) {
    options.caCertPath = setting.rootCaFile.certPath
    options.caKeyPath = setting.rootCaFile.keyPath
  }
  return options
}
