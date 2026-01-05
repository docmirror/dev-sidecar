import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isObject } from 'lodash'
import { initDNS } from './lib/dns'
import interceptorImpls from './lib/interceptor'
import { handleScriptInterceptConfig } from './lib/interceptor/impl/res/script'
import { createOverwallMiddleware, downloadPacAsync, getTmpPacFilePath } from './lib/proxy/middleware/overwall'
import { debug, error, info, warn } from './utils/util.log.server'
import { domainMapRegexply, isMatched, matchHostname, matchHostnameAll } from './utils/util.match'

// 处理拦截配置
function buildIntercepts (intercepts) {
  // 自动生成script拦截器所需的辅助配置，降低使用`script拦截器`配置绝对地址和相对地址时的门槛
  handleScriptInterceptConfig(intercepts)

  return intercepts
}

// 从拦截器配置中，获取exclusions字段，返回数组类型
function getExclusionArray (exclusions) {
  let ret = null
  if (Array.isArray(exclusions)) {
    if (exclusions.length > 0) {
      ret = exclusions
    }
  } else if (isObject(exclusions)) {
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

export default (serverConfig) => {
  const intercepts = domainMapRegexply(buildIntercepts(serverConfig.intercepts))
  const whiteList = domainMapRegexply(serverConfig.whiteList)
  const timeoutMapping = domainMapRegexply(serverConfig.setting.timeoutMapping)

  const dnsMapping = serverConfig.dns.mapping
  const setting = serverConfig.setting

  if (!setting.script.dirAbsolutePath) {
    setting.script.dirAbsolutePath = join(setting.rootDir, setting.script.defaultDir)
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
    if (!pacConfig.pacFileAbsolutePath && existsSync(getTmpPacFilePath())) {
      pacConfig.pacFileAbsolutePath = getTmpPacFilePath()
      info('读取已下载的 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
    }

    if (!pacConfig.pacFileAbsolutePath) {
      info('setting.rootDir:', setting.rootDir)
      pacConfig.pacFileAbsolutePath = join(setting.rootDir, pacConfig.pacFilePath)
      info('读取内置的 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
      if (pacConfig.autoUpdate) {
        warn('远程 pac.txt 文件下载失败或还在下载中，现使用内置 pac.txt 文件:', pacConfig.pacFileAbsolutePath)
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

  const preSetIpList = domainMapRegexply(serverConfig.preSetIpList)

  const options = {
    host: serverConfig.host,
    port: serverConfig.port,
    dnsConfig: {
      preSetIpList,
      dnsMap: initDNS(serverConfig.dns.providers, preSetIpList),
      mapping: domainMapRegexply(dnsMapping),
      speedTest: serverConfig.dns.speedTest,
    },
    setting,
    compatibleConfig: {
      connect: serverConfig.compatible ? domainMapRegexply(serverConfig.compatible.connect) : {},
      request: serverConfig.compatible ? domainMapRegexply(serverConfig.compatible.request) : {},
    },
    middlewares,
    sslConnectInterceptor: (req, cltSocket, head) => {
      const hostname = req.url.split(':')[0]

      // 配置了白名单的域名，将跳过代理
      const inWhiteList = !!matchHostname(whiteList, hostname, 'in whiteList')
      if (inWhiteList) {
        info(`为白名单域名，不拦截: ${hostname}`)
        return false // 不拦截
      }

      // 配置了拦截的域名，将会被代理
      const matched = matchHostname(intercepts, hostname, 'matched intercepts')
      if ((!!matched) === true) {
        debug(`拦截器拦截：${req.url}, matched:`, matched)
        return matched // 拦截
      }

      return null // 不在白名单中，也未配置在拦截功能中，跳过当前拦截器，由下一个拦截器判断
    },
    createIntercepts: (context) => {
      const rOptions = context.rOptions
      const interceptOpts = matchHostnameAll(intercepts, rOptions.hostname, 'get interceptOpts')
      if (!interceptOpts) { // 该域名没有配置拦截器，直接过
        return
      }

      const matchIntercepts = []
      const matchInterceptsOpts = {}
      for (const regexp in interceptOpts) { // 遍历拦截配置
        // 判断是否匹配拦截器
        const matched = isMatched(rOptions.path, regexp)
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
                if (isMatched(rOptions.path, exclusion)) {
                  debug(`拦截器配置排除了path：${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}, exclusion: '${exclusion}', interceptOpt:`, interceptOpt)
                  isExcluded = true
                }
              }
            }
          } catch (e) {
            error(`判断拦截器是否排除当前path时出现异常, path: ${rOptions.path}, interceptOpt:`, interceptOpt, ', error:', e)
          }
          if (isExcluded) {
            continue
          }
        }

        debug(`拦截器匹配path成功：${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}, regexp: ${regexp}, interceptOpt:`, interceptOpt)

        // log.info(`interceptor matched, regexp: '${regexp}' =>`, JSON.stringify(interceptOpt), ', url:', url)
        for (const impl of interceptorImpls) {
          // 根据拦截配置挑选合适的拦截器来处理
          if (impl.is && impl.is(interceptOpt)) {
            let action = 'add'

            // 如果存在同名拦截器，则order值越大，优先级越高
            const matchedInterceptOpt = matchInterceptsOpts[impl.name]
            if (matchedInterceptOpt) {
              if (matchedInterceptOpt.order >= (interceptOpt.order || 0)) {
                warn(`duplicate interceptor: ${impl.name}, hostname: ${rOptions.hostname}`)
                continue
              }
              action = 'replace'
            }

            const interceptor = { name: impl.name, priority: impl.priority }
            if (impl.requestIntercept) {
              // req拦截器
              interceptor.requestIntercept = (context, req, res, ssl, next) => {
                return impl.requestIntercept(context, interceptOpt, req, res, ssl, next, matched, interceptOpts.matched)
              }
            } else if (impl.responseIntercept) {
              // res拦截器
              interceptor.responseIntercept = (context, req, res, proxyReq, proxyRes, ssl, next) => {
                return impl.responseIntercept(context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next, matched, interceptOpts.matched)
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
              index: matchIntercepts.length - 1,
            }
          }
        }
      }

      matchIntercepts.sort((a, b) => {
        return a.priority - b.priority
      })
      // for (const interceptor of matchIntercepts) {
      //   log.info('interceptor:', interceptor.name, 'priority:', interceptor.priority)
      // }

      return matchIntercepts
    },
  }

  if (setting.rootCaFile) {
    options.caCertPath = setting.rootCaFile.certPath
    options.caKeyPath = setting.rootCaFile.keyPath
  }
  return options
}
