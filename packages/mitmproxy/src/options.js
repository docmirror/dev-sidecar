const interceptorImpls = require('./lib/interceptor')
const dnsUtil = require('./lib/dns')
const log = require('./utils/util.log')
const matchUtil = require('./utils/util.match')
const path = require('path')
const fs = require('fs')
const lodash = require('lodash')
const scriptInterceptor = require('./lib/interceptor/impl/res/script')

const { getTmpPacFilePath, downloadPacAsync, createOverwallMiddleware } = require('./lib/proxy/middleware/overwall')

// 处理拦截配置
function buildIntercepts (intercepts) {
  // 自动生成script拦截器所需的辅助配置，降低使用`script拦截器`配置绝对地址和相对地址时的门槛
  scriptInterceptor.handleScriptInterceptConfig(intercepts)

  return intercepts
}

// 从拦截器配置中，获取exclusions字段，返回数组类型
function getExclusionArray (exclusions) {
  let ret = null
  if (Array.isArray(exclusions)) {
    if (exclusions.length > 0) {
      ret = exclusions
    }
  } else if (lodash.isObject(exclusions)) {
    ret = []
    for (const exclusion in exclusions) {
      ret.push(exclusion)
    }
    if (ret.length === 0) {
      return null
    }
  }
  return ret
}

module.exports = (serverConfig) => {
  const intercepts = matchUtil.domainMapRegexply(buildIntercepts(serverConfig.intercepts))
  const whiteList = matchUtil.domainMapRegexply(serverConfig.whiteList)
  const timeoutMapping = matchUtil.domainMapRegexply(serverConfig.setting.timeoutMapping)

  const dnsMapping = serverConfig.dns.mapping
  const setting = serverConfig.setting

  if (!setting.script.dirAbsolutePath) {
    setting.script.dirAbsolutePath = path.join(setting.rootDir, setting.script.defaultDir)
  }
  if (setting.verifySsl !== false) {
    setting.verifySsl = true
  }
  setting.timeoutMapping = timeoutMapping

  const overWallConfig = serverConfig.plugin.overwall
  if (overWallConfig.pac && overWallConfig.pac.enabled) {
    const pacConfig = overWallConfig.pac

    // 自动更新 pac.txt
    if (!pacConfig.pacFileAbsolutePath && pacConfig.autoUpdate) {
      // 异步下载远程 pac.txt 文件，并保存到本地；下载成功后，需要重启代理服务才会生效
      downloadPacAsync(pacConfig)
    }

    // 优先使用本地已下载的 pac.txt 文件
    if (!pacConfig.pacFileAbsolutePath && fs.existsSync(getTmpPacFilePath())) {
      pacConfig.pacFileAbsolutePath = getTmpPacFilePath()
      log.info('读取已下载的 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
    }

    if (!pacConfig.pacFileAbsolutePath) {
      log.info('setting.rootDir:', setting.rootDir)
      pacConfig.pacFileAbsolutePath = path.join(setting.rootDir, pacConfig.pacFilePath)
      log.info('读取内置的 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
      if (pacConfig.autoUpdate) {
        log.warn('远程 pac.txt 文件下载失败或还在下载中，现使用内置 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
      }
    }
  }

  // 插件列表
  const middlewares = []

  // 梯子插件：如果启用了，则添加到插件列表中
  const overwallMiddleware = createOverwallMiddleware(overWallConfig)
  if (overwallMiddleware) {
    middlewares.push(overwallMiddleware)
  }

  const preSetIpList = matchUtil.domainMapRegexply(serverConfig.preSetIpList)

  const options = {
    host: serverConfig.host,
    port: serverConfig.port,
    dnsConfig: {
      preSetIpList,
      providers: dnsUtil.initDNS(serverConfig.dns.providers, preSetIpList),
      mapping: matchUtil.domainMapRegexply(dnsMapping),
      speedTest: serverConfig.dns.speedTest
    },
    setting,
    sniConfig: serverConfig.sniList,
    middlewares,
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]
      const inWhiteList = matchUtil.matchHostname(whiteList, hostname, 'in whiteList') != null
      if (inWhiteList) {
        log.info(`为白名单域名，不拦截: ${hostname}, headers:`, req.headers)
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
        const matched = matchUtil.isMatched(rOptions.path, regexp)
        if (matched == null) { // 拦截器匹配失败
          continue
        }

        // 获取拦截器
        const interceptOpt = interceptOpts[regexp]
        // interceptOpt.key = regexp

        // 添加exclusions字段，用于排除某些路径
        // @since 1.8.5
        if (interceptOpt.exclusions) {
          let isExcluded = false
          try {
            const exclusions = getExclusionArray(interceptOpt.exclusions)
            if (exclusions) {
              for (const exclusion of exclusions) {
                if (matchUtil.isMatched(rOptions.path, exclusion)) {
                  log.debug(`拦截器配置排除了path：${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}, exclusion: '${exclusion}', interceptOpt:`, interceptOpt)
                  isExcluded = true
                }
              }
            }
          } catch (e) {
            log.error(`判断拦截器是否排除当前path时出现异常, path: ${rOptions.path}, interceptOpt:`, interceptOpt, ', error:', e)
          }
          if (isExcluded) {
            continue
          }
        }

        log.debug(`拦截器匹配path成功：${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}, regexp: ${regexp}, interceptOpt:`, interceptOpt)

        // log.info(`interceptor matched, regexp: '${regexp}' =>`, JSON.stringify(interceptOpt), ', url:', url)
        for (const impl of interceptorImpls) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (impl.is && impl.is(interceptOpt)) {
            let action = 'add'

            // 如果存在同名拦截器，则order值越大，优先级越高
            const matchedInterceptOpt = matchInterceptsOpts[impl.name]
            if (matchedInterceptOpt) {
              if (matchedInterceptOpt.order >= (interceptOpt.order || 0)) {
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
