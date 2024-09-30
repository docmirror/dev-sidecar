const url = require('url')
const Agent = require('./ProxyHttpAgent')
const HttpsAgent = require('./ProxyHttpsAgent')
const tunnelAgent = require('tunnel-agent')
const log = require('../../../utils/util.log')
const matchUtil = require('../../../utils/util.match')
const util = exports

const httpsAgentCache = {}
const httpAgentCache = {}

let socketId = 0

let httpsOverHttpAgent, httpOverHttpsAgent, httpsOverHttpsAgent

function getTimeoutConfig (hostname, serverSetting) {
  const timeoutMapping = serverSetting.timeoutMapping

  const timeoutConfig = matchUtil.matchHostname(timeoutMapping, hostname, 'get timeoutConfig') || {}

  return {
    timeout: timeoutConfig.timeout || serverSetting.defaultTimeout || 20000,
    keepAliveTimeout: timeoutConfig.keepAliveTimeout || serverSetting.defaultKeepAliveTimeout || 30000
  }
}

function createHttpsAgent (timeoutConfig, verifySsl) {
  const key = timeoutConfig.timeout + '-' + timeoutConfig.keepAliveTimeout
  if (!httpsAgentCache[key]) {
    verifySsl = !!verifySsl

    // 证书回调函数
    const checkServerIdentity = (host, cert) => {
      log.info(`checkServerIdentity: ${host}, CN: ${cert.subject.CN}, C: ${cert.subject.C || cert.issuer.C}, ST: ${cert.subject.ST || cert.issuer.ST}, bits: ${cert.bits}`)
    }

    const agent = new HttpsAgent({
      keepAlive: true,
      timeout: timeoutConfig.timeout,
      keepAliveTimeout: timeoutConfig.keepAliveTimeout,
      checkServerIdentity,
      rejectUnauthorized: verifySsl
    })

    agent.unVerifySslAgent = new HttpsAgent({
      keepAlive: true,
      timeout: timeoutConfig.timeout,
      keepAliveTimeout: timeoutConfig.keepAliveTimeout,
      checkServerIdentity,
      rejectUnauthorized: false
    })

    httpsAgentCache[key] = agent
    log.info('创建 HttpsAgent 成功, timeoutConfig:', timeoutConfig, ', verifySsl:', verifySsl)
  }
  return httpsAgentCache[key]
}

function createHttpAgent (timeoutConfig) {
  const key = timeoutConfig.timeout + '-' + timeoutConfig.keepAliveTimeout
  if (!httpAgentCache[key]) {
    httpAgentCache[key] = new Agent({
      keepAlive: true,
      timeout: timeoutConfig.timeout,
      keepAliveTimeout: timeoutConfig.keepAliveTimeout
    })
    log.info('创建 HttpAgent 成功, timeoutConfig:', timeoutConfig)
  }
  return httpAgentCache[key]
}

function createAgent (protocol, timeoutConfig, verifySsl) {
  return protocol === 'https:'
    ? createHttpsAgent(timeoutConfig, verifySsl)
    : createHttpAgent(timeoutConfig)
}

util.parseHostnameAndPort = (host, defaultPort) => {
  let arr = host.match(/^(\[[^\]]+\])(?::(\d+))?$/) // 尝试解析IPv6
  if (arr) {
    arr = arr.slice(1)
    if (arr[1]) {
      arr[1] = parseInt(arr[1], 10)
    }
  } else {
    arr = host.split(':')
    if (arr.length > 1) {
      arr[1] = parseInt(arr[1], 10)
    }
  }

  if (defaultPort > 0 && (arr.length === 1 || arr[1] === undefined)) {
    arr[1] = defaultPort
  } else if (arr.length === 2 && arr[1] === undefined) {
    arr.pop()
  }

  return arr
}

util.getOptionsFromRequest = (req, ssl, externalProxy = null, serverSetting) => {
  // eslint-disable-next-line node/no-deprecated-api
  const urlObject = url.parse(req.url)
  const defaultPort = ssl ? 443 : 80
  const protocol = ssl ? 'https:' : 'http:'
  const headers = Object.assign({}, req.headers)
  let externalProxyUrl = null

  if (externalProxy) {
    if (typeof externalProxy === 'string') {
      externalProxyUrl = externalProxy
    } else if (typeof externalProxy === 'function') {
      try {
        externalProxyUrl = externalProxy(req, ssl)
      } catch (e) {
        log.error('externalProxy error:', e)
      }
    }
  }

  // 解析host和port
  const arr = util.parseHostnameAndPort(req.headers.host)
  const hostname = arr[0]
  const port = arr[1] || defaultPort

  delete headers['proxy-connection']
  let agent
  if (!externalProxyUrl) {
    // keepAlive
    if (headers.connection !== 'close') {
      const timeoutConfig = getTimeoutConfig(hostname, serverSetting)
      // log.info(`get timeoutConfig '${hostname}':`, timeoutConfig)
      agent = createAgent(protocol, timeoutConfig, serverSetting.verifySsl)
      headers.connection = 'keep-alive'
    } else {
      agent = false
    }
  } else {
    agent = util.getTunnelAgent(protocol === 'https:', externalProxyUrl)
  }

  // 初始化options
  const options = {
    protocol,
    method: req.method,
    url: req.url,
    hostname,
    port,
    path: urlObject.path,
    headers: req.headers,
    agent
  }

  // eslint-disable-next-line node/no-deprecated-api
  if (protocol === 'http:' && externalProxyUrl && (url.parse(externalProxyUrl)).protocol === 'http:') {
    // eslint-disable-next-line node/no-deprecated-api
    const externalURL = url.parse(externalProxyUrl)
    options.hostname = externalURL.hostname
    options.port = externalURL.port
    // support non-transparent proxy
    options.path = `http://${urlObject.host}${urlObject.path}`
  }

  // mark a socketId for Agent to bind socket for NTLM
  if (req.socket.customSocketId) {
    options.customSocketId = req.socket.customSocketId
  } else if (headers.authorization) {
    options.customSocketId = req.socket.customSocketId = socketId++
  }

  return options
}

util.getTunnelAgent = (requestIsSSL, externalProxyUrl) => {
  // eslint-disable-next-line node/no-deprecated-api
  const urlObject = url.parse(externalProxyUrl)
  const protocol = urlObject.protocol || 'http:'
  let port = urlObject.port
  if (!port) {
    port = protocol === 'http:' ? 80 : 443
  }
  const hostname = urlObject.hostname || 'localhost'

  if (requestIsSSL) {
    if (protocol === 'http:') {
      if (!httpsOverHttpAgent) {
        httpsOverHttpAgent = tunnelAgent.httpsOverHttp({
          proxy: {
            host: hostname,
            port: port
          }
        })
      }
      return httpsOverHttpAgent
    } else {
      if (!httpsOverHttpsAgent) {
        httpsOverHttpsAgent = tunnelAgent.httpsOverHttps({
          proxy: {
            host: hostname,
            port: port
          }
        })
      }
      return httpsOverHttpsAgent
    }
  } else {
    if (protocol === 'http:') {
      // if (!httpOverHttpAgent) {
      //     httpOverHttpAgent = tunnelAgent.httpOverHttp({
      //         proxy: {
      //             host: hostname,
      //             port: port
      //         }
      //     })
      // }
      return false
    } else {
      if (!httpOverHttpsAgent) {
        httpOverHttpsAgent = tunnelAgent.httpOverHttps({
          proxy: {
            host: hostname,
            port: port
          }
        })
      }
      return httpOverHttpsAgent
    }
  }
}
