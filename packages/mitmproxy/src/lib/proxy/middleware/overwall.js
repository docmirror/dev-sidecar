const { Buffer } = require('node:buffer')
const fs = require('node:fs')
const path = require('node:path')
const url = require('node:url')
const lodash = require('lodash')
const request = require('request')
const log = require('../../../utils/util.log')
const matchUtil = require('../../../utils/util.match')
const pac = require('./source/pac')
const dateUtil = require('@docmirror/dev-sidecar/src/utils/util.date')

let pacClient = null

function matched (hostname, overWallTargetMap) {
  // 匹配配置文件
  const ret1 = matchUtil.matchHostname(overWallTargetMap, hostname, 'matched overwall')
  if (ret1) {
    return 'in config'
  } else if (ret1 === false || ret1 === 'false') {
    log.debug(`域名 ${hostname} 的overwall配置为 false，跳过增强功能，即使它在 pac.txt 里`)
    return null
  }

  // 匹配 pac.txt
  if (pacClient == null) {
    return null
  }
  const ret = pacClient.FindProxyForURL(`https://${hostname}`, hostname)
  if (ret && ret.indexOf('PROXY ') === 0) {
    log.info(`matchHostname: matched overwall: '${hostname}' -> '${ret}' in pac.txt`)
    return 'in pac.txt'
  } else {
    log.debug(`matchHostname: matched overwall: Not-Matched '${hostname}' -> '${ret}' in pac.txt`)
    return null
  }
}

function getUserBasePath () {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  return path.resolve(userHome, './.dev-sidecar')
}

// 下载的 pac.txt 文件保存路径
function getTmpPacFilePath () {
  return path.join(getUserBasePath(), '/pac.txt')
}

function loadPacLastModifiedTime (pacTxt) {
  const matched = pacTxt.match(/(?<=! Last Modified: )[^\r\n]+/g)
  if (matched && matched.length > 0) {
    try {
      return new Date(matched[0])
    } catch {
      return null
    }
  }
}

// 保存 pac 内容到 `~/pac.txt` 文件中
function savePacFile (pacTxt) {
  const pacFilePath = getTmpPacFilePath()
  try {
    fs.writeFileSync(pacFilePath, pacTxt)
    log.info('保存 pac.txt 文件成功:', pacFilePath)
  } catch (e) {
    log.error('保存 pac.txt 文件失败:', pacFilePath, ', error:', e)
    return
  }

  // 尝试解析和修改 pac.txt 文件时间
  const lastModifiedTime = loadPacLastModifiedTime(pacTxt)
  if (lastModifiedTime) {
    fs.stat(pacFilePath, (err, _stats) => {
      if (err) {
        log.error('修改 pac.txt 文件时间失败:', err)
        return
      }

      // 修改文件的访问时间和修改时间为当前时间
      fs.utimes(pacFilePath, lastModifiedTime, lastModifiedTime, (utimesErr) => {
        if (utimesErr) {
          log.error('修改 pac.txt 文件时间失败:', utimesErr)
        } else {
          log.info(`'${pacFilePath}' 文件的修改时间已更新为其最近更新时间 '${dateUtil.format(lastModifiedTime, false)}'`)
        }
      })
    })
  }
}

// 异步下载 pac.txt ，避免影响代理服务的启动速度
async function downloadPacAsync (pacConfig) {
  const remotePacFileUrl = pacConfig.pacFileUpdateUrl
  log.info('开始下载远程 pac.txt 文件:', remotePacFileUrl)
  request(remotePacFileUrl, (error, response, body) => {
    if (error) {
      log.error(`下载远程 pac.txt 文件失败: ${remotePacFileUrl}, error:`, error, ', response:', response, ', body:', body)
      return
    }
    if (response && response.statusCode === 200) {
      if (body == null || body.length < 100) {
        log.warn('下载远程 pac.txt 文件成功，但内容为空或内容太短，判断为无效的 pax.txt 文件:', remotePacFileUrl, ', body:', body)
        return
      } else {
        log.info('下载远程 pac.txt 文件成功:', remotePacFileUrl)
      }

      // 尝试解析Base64（注：https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt 下载下来的是Base64格式）
      let pacTxt = body
      if (!pacTxt.includes('!---------------------EOF')) {
        try {
          pacTxt = Buffer.from(pacTxt, 'base64').toString('utf8')
          // log.debug('解析 base64 后的 pax:', pacTxt)
        } catch {
          log.error(`远程 pac.txt 文件内容即不是base64格式，也不是要求的格式，url: ${remotePacFileUrl}，body: ${body}`)
          return
        }
      }

      // 保存到本地
      savePacFile(pacTxt)
    } else {
      log.error(`下载远程 pac.txt 文件失败: ${remotePacFileUrl}, response:`, response, ', body:', body)
    }
  })
}

function createOverwallMiddleware (overWallConfig) {
  if (!overWallConfig || overWallConfig.enabled !== true) {
    return null
  }
  if (overWallConfig.pac && overWallConfig.pac.enabled) {
    // 初始化pac
    pacClient = pac.createPacClient(overWallConfig.pac.pacFileAbsolutePath)
  }

  let server = overWallConfig.server
  let keys = Object.keys(server)
  if (keys.length === 0) {
    server = overWallConfig.serverDefault
    keys = Object.keys(server)
  }
  if (keys.length === 0) {
    return null
  }
  const overWallTargetMap = matchUtil.domainMapRegexply(overWallConfig.targets)
  return {
    sslConnectInterceptor: (req, _cltSocket, _head) => {
      const hostname = req.url.split(':')[0]
      return matched(hostname, overWallTargetMap)
    },
    requestIntercept (context, req, res, _ssl, _next) {
      const { rOptions, log, RequestCounter } = context
      if (rOptions.protocol === 'http:') {
        return
      }
      const hostname = rOptions.hostname
      const matchedResult = matched(hostname, overWallTargetMap)
      if (matchedResult == null || matchedResult === false || matchedResult === 'false') {
        return
      }
      const cacheKey = '__over_wall_proxy__'
      let proxyServer = keys[0]
      if (RequestCounter && keys.length > 1) {
        const count = RequestCounter.getOrCreate(cacheKey, keys)
        if (count.value == null) {
          count.doRank()
        }
        if (count.value == null) {
          log.error('`count.value` is null, the count:', count)
        } else {
          count.doCount(count.value)
          proxyServer = count.value
          context.requestCount = {
            key: cacheKey,
            value: count.value,
            count,
          }
        }
      }

      const domain = proxyServer
      const port = server[domain].port
      const path = server[domain].path
      const password = server[domain].password
      const proxyTarget = `${domain}/${path}/${hostname}${req.url}`

      // const backup = interceptOpt.backup
      const proxy = proxyTarget.indexOf('http:') === 0 || proxyTarget.indexOf('https:') === 0 ? proxyTarget : (`${rOptions.protocol}//${proxyTarget}`)
      // eslint-disable-next-line node/no-deprecated-api
      const URL = url.parse(proxy)
      rOptions.origional = lodash.cloneDeep(rOptions) // 备份原始请求参数
      delete rOptions.origional.agent
      delete rOptions.origional.headers
      rOptions.protocol = URL.protocol
      rOptions.hostname = URL.host
      rOptions.host = URL.host
      rOptions.headers.host = URL.host
      if (password) {
        rOptions.headers.dspassword = password
      }
      rOptions.path = URL.path
      if (URL.port == null) {
        rOptions.port = port || (rOptions.protocol === 'https:' ? 443 : 80)
      }
      log.info('OverWall:', rOptions.hostname, '➜', proxyTarget)
      if (context.requestCount) {
        log.debug('OverWall choice:', JSON.stringify(context.requestCount))
      }

      res.setHeader('DS-Overwall', matchedResult)

      return true
    },
  }
}

module.exports = {
  getTmpPacFilePath,
  downloadPacAsync,
  createOverwallMiddleware,
}
