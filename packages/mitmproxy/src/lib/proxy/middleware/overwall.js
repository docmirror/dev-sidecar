const { Buffer } = require('node:buffer')
const fs = require('node:fs')
const path = require('node:path')
const URL = require('node:url')
const request = require('request')
const log = require('../../../utils/util.log.server')
const matchUtil = require('../../../utils/util.match')
const pac = require('./source/pac')
const dateUtil = require('@docmirror/dev-sidecar/src/utils/util.date')

let pacClient = null

function matchTarget (hostname, overWallTargetMap) {
  // 匹配配置文件
  const ret1 = matchUtil.matchHostname(overWallTargetMap, hostname, 'matched overwall')
  if (ret1) {
    if (ret1 === false || ret1 === 'false') {
      log.debug(`域名 ${hostname} 的overwall配置为 false，跳过增强功能，即使它在 pac.txt 里`)
      return null
    }
    return { source: 'config', value: ret1 }
  }

  // 匹配 pac.txt
  if (pacClient == null) {
    return null
  }
  const ret = pacClient.FindProxyForURL(`https://${hostname}`, hostname)
  if (ret && ret.indexOf('PROXY ') === 0) {
    log.info(`matchHostname: matched overwall: '${hostname}' -> '${ret}' in pac.txt`)
    return { source: 'pac' }
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

function buildServerList (overWallConfig) {
  const list = []
  const customServer = overWallConfig.server || {}
  const defaultServer = overWallConfig.serverDefault || {}

  // 内置默认服务器 ID 固定为 0；用户自定义服务器在此基础上依次增加
  let nextId = 1
  for (const [domain, cfg] of Object.entries(defaultServer)) {
    if (!customServer[domain]) {
      list.push({
        id: cfg && cfg.id != null ? Number.parseInt(cfg.id, 10) : 0,
        domain,
        port: cfg && cfg.port,
        path: cfg && cfg.path,
        password: cfg && cfg.password,
      })
    }
  }

  for (const [domain, cfg] of Object.entries(customServer)) {
    const item = {
      id: cfg && cfg.id != null ? Number.parseInt(cfg.id, 10) : nextId,
      domain,
      port: cfg && cfg.port,
      path: cfg && cfg.path,
      password: cfg && cfg.password,
    }
    if (item.id >= nextId) {
      nextId = item.id + 1
    }
    list.push(item)
  }

  return list
}

function createOverwallMiddleware (overWallConfig) {
  if (!overWallConfig || overWallConfig.enabled !== true) {
    return null
  }
  if (overWallConfig.pac && overWallConfig.pac.enabled) {
    // 初始化pac
    pacClient = pac.createPacClient(overWallConfig.pac.pacFileAbsolutePath)
  }

  const serverList = buildServerList(overWallConfig)
  if (serverList.length === 0) {
    return null
  }
  const serverById = new Map(serverList.map((item) => [item.id, item]))

  // 默认优先使用 ID 为 1 的服务器；若 ID 为 1 的服务器不存在，则自动使用 ID 为 0 的默认服务器
  const defaultServerId = serverById.has(1) ? 1 : 0

  function resolveServerId (targetValue) {
    if (targetValue && typeof targetValue === 'object' && targetValue.enabled !== false && targetValue.serverId != null) {
      const id = Number.parseInt(targetValue.serverId, 10)
      if (serverById.has(id)) {
        return id
      }
    }
    return defaultServerId
  }

  const overWallTargetMap = matchUtil.domainMapRegexply(overWallConfig.targets)
  return {
    sslConnectInterceptor: (req, _cltSocket, _head) => {
      const hostname = req.url.split(':')[0]
      return matchTarget(hostname, overWallTargetMap) != null
    },
    requestIntercept (context, req, res, _ssl, _next) {
      const { rOptions, log } = context
      if (rOptions.protocol === 'http:') {
        return
      }
      const hostname = rOptions.hostname
      const target = matchTarget(hostname, overWallTargetMap)
      if (target == null) {
        return
      }

      const serverId = target.source === 'config' ? resolveServerId(target.value) : defaultServerId
      const selected = serverById.get(serverId)
      if (!selected) {
        return
      }

      const domain = selected.domain
      const port = selected.port
      const path = selected.path
      const password = selected.password
      const proxyTarget = `${domain}/${path}/${hostname}${req.url}`

      // const backup = interceptOpt.backup
      const proxy = proxyTarget.indexOf('http:') === 0 || proxyTarget.indexOf('https:') === 0 ? proxyTarget : (`${rOptions.protocol}//${proxyTarget}`)
      // eslint-disable-next-line node/no-deprecated-api
      const urlObj = URL.parse(proxy)

      // 备份原始请求参数，不包含 agent 和 headers（agent 是共享单例，headers 在代理转发时会被改写）
      const { agent: _agent, headers: _headers, ...original } = rOptions
      rOptions.original = original

      rOptions.protocol = urlObj.protocol
      rOptions.hostname = urlObj.hostname
      rOptions.host = urlObj.host
      rOptions.headers.host = urlObj.host
      if (password) {
        rOptions.headers.dspassword = password
      }
      rOptions.path = urlObj.path
      if (urlObj.port) {
        rOptions.port = Number.parseInt(urlObj.port)
      } else {
        rOptions.port = port || (rOptions.protocol === 'https:' ? 443 : 80)
      }
      log.info('OverWall:', rOptions.hostname, '➜', proxyTarget, `, serverId: ${serverId}`)

      res.setHeader('DS-Overwall', `${target.source}:${serverId}`)

      return true
    },
  }
}

module.exports = {
  getTmpPacFilePath,
  downloadPacAsync,
  createOverwallMiddleware,
}
