const url = require('url')
const Agent = require('./ProxyHttpAgent')
const HttpsAgent = require('./ProxyHttpsAgent')
const tunnelAgent = require('tunnel-agent')
const log = require('../../../utils/util.log')
const util = exports
const httpsAgent = new HttpsAgent({
  keepAlive: true,
  timeout: 20000,
  keepAliveTimeout: 30000, // free socket keepalive for 30 seconds
  rejectUnauthorized: false
})
const httpAgent = new Agent({
  keepAlive: true,
  timeout: 20000,
  keepAliveTimeout: 30000 // free socket keepalive for 30 seconds
})
let socketId = 0

let httpsOverHttpAgent, httpOverHttpsAgent, httpsOverHttpsAgent

util.getOptionsFormRequest = (req, ssl, externalProxy = null) => {
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
        log.error('externalProxy', e)
      }
    }
  }

  delete headers['proxy-connection']
  let agent = false
  if (!externalProxyUrl) {
    // keepAlive
    if (headers.connection !== 'close') {
      if (protocol === 'https:') {
        agent = httpsAgent
      } else {
        agent = httpAgent
      }
      headers.connection = 'keep-alive'
    }
  } else {
    agent = util.getTunnelAgent(protocol === 'https:', externalProxyUrl)
  }

  const options = {
    protocol: protocol,
    hostname: req.headers.host.split(':')[0],
    method: req.method,
    port: req.headers.host.split(':')[1] || defaultPort,
    path: urlObject.path,
    headers: req.headers,
    agent: agent
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
      //     });
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
