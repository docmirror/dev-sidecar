const interceptorImpls = require('./lib/interceptor')
const dnsUtil = require('./lib/dns')
const log = require('./utils/util.log')
const matchUtil = require('./utils/util.match')
const path = require('path')
const scriptInterceptor = require('./lib/interceptor/impl/res/script')

const createOverwallMiddleware = require('./lib/proxy/middleware/overwall')

// 处理拦截配置
function buildIntercepts (intercepts) {
  // 自动生成script拦截器所需的辅助配置，降低使用`script拦截器`配置绝对地址和相对地址时的门槛
  scriptInterceptor.handleScriptInterceptConfig(intercepts)

  return intercepts
}

module.exports = (config) => {
  const intercepts = matchUtil.domainMapRegexply(buildIntercepts(config.intercepts))
  const whiteList = matchUtil.domainMapRegexply(config.whiteList)

  const dnsMapping = config.dns.mapping
  const serverConfig = config
  const setting = serverConfig.setting

  if (!setting.script.dirAbsolutePath) {
    setting.script.dirAbsolutePath = path.join(setting.rootDir, setting.script.defaultDir)
  }
  if (setting.verifySsl !== false) {
    setting.verifySsl = true
  }

  const overwallConfig = serverConfig.plugin.overwall
  if (!overwallConfig.pac.pacFileAbsolutePath) {
    overwallConfig.pac.pacFileAbsolutePath = path.join(setting.rootDir, overwallConfig.pac.pacFilePath)
  }

  // 插件列表
  const middlewares = []

  // 梯子插件：如果启用了，则添加到插件列表中
  const overwallMiddleware = createOverwallMiddleware(overwallConfig)
  if (overwallMiddleware) {
    middlewares.push(overwallMiddleware)
  }

  const options = {
    host: serverConfig.host,
    port: serverConfig.port,
    dnsConfig: {
      providers: dnsUtil.initDNS(serverConfig.dns.providers, matchUtil.domainMapRegexply(config.preSetIpList)),
      mapping: matchUtil.domainMapRegexply(dnsMapping),
      speedTest: config.dns.speedTest
    },
    setting,
    sniConfig: serverConfig.sniList,
    middlewares,
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      const inWhiteList = matchUtil.matchHostname(whiteList, hostname, 'in whiteList') != null
      if (inWhiteList) {
        log.info('为白名单域名，不拦截:', hostname)
        return false // 所有都不拦截
      }
      // 配置了拦截的域名，将会被代理
      const matched = !!matchUtil.matchHostname(intercepts, hostname, 'matched intercepts')
      if (matched === true) {
        return matched // 拦截
      }
      return null // 未匹配到任何拦截配置，由下一个拦截器判断
    },
    createIntercepts: (context) => {
      const rOptions = context.rOptions
      const interceptOpts = matchUtil.matchHostnameAll(intercepts, rOptions.hostname, 'get interceptOpts')
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        return
      }

      const matchIntercepts = []
      const matchInterceptsOpts = {}
      for (const regexp in interceptOpts) { // 遍历拦截配置
        // 判断是否匹配拦截器
        let matched
        if (regexp !== true && regexp !== 'true') {
          matched = matchUtil.isMatched(rOptions.path, regexp)
          if (matched == null) { // 拦截器匹配失败
            continue
          }
        }

        // 获取拦截器
        const interceptOpt = interceptOpts[regexp]
        // interceptOpt.key = regexp

        // log.info(`interceptor matched, regexp: '${regexp}' =>`, JSON.stringify(interceptOpt), ', url:', url)
        for (const impl of interceptorImpls) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (impl.is && impl.is(interceptOpt)) {
            let action = 'add'

            // 如果存在同名拦截器，则order值越大，优先级越高
            const matchedInterceptOpt = matchInterceptsOpts[impl.name]
            if (matchedInterceptOpt) {
              if (matchedInterceptOpt.order >= interceptOpt.order) {
                log.warn(`duplicate interceptor: ${impl.name}, hostname: ${rOptions.hostname}`)
                continue
              }
              action = 'replace'
            }

            const interceptor = { name: impl.name, priority: impl.priority }
            if (impl.requestIntercept) {
              // req拦截器
              interceptor.requestIntercept = (context, req, res, ssl, next) => {
                return impl.requestIntercept(context, interceptOpt, req, res, ssl, next, matched)
              }
            } else if (impl.responseIntercept) {
              // res拦截器
              interceptor.responseIntercept = (context, req, res, proxyReq, proxyRes, ssl, next) => {
                return impl.responseIntercept(context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next, matched)
              }
            }

            // log.info(`${action} interceptor: ${impl.name}, hostname: ${rOptions.hostname}, regexp: ${regexp}`)
            if (action === 'add') {
              matchIntercepts.push(interceptor)
            } else {
              matchIntercepts[matchedInterceptOpt.index] = interceptor
            }
            matchInterceptsOpts[impl.name] = {
              order: interceptOpt.order || 0,
              index: matchIntercepts.length - 1
            }
          }
        }
      }

      matchIntercepts.sort((a, b) => { return a.priority - b.priority })
      // for (const interceptor of matchIntercepts) {
      //   log.info('interceptor:', interceptor.name, 'priority:', interceptor.priority)
      // }

      return matchIntercepts
    }
  }

  if (setting.rootCaFile) {
    options.caCertPath = setting.rootCaFile.certPath
    options.caKeyPath = setting.rootCaFile.keyPath
  }
  return options
}
