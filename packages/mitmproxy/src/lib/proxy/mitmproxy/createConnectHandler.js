const net = require('net')
const url = require('url')
const log = require('../../../utils/util.log')
const DnsUtil = require('../../dns/index')
const localIP = '127.0.0.1'
const dnsLookup = require('./dnsLookup')

function isSslConnect (sslConnectInterceptors, req, cltSocket, head) {
  for (const intercept of sslConnectInterceptors) {
    const ret = intercept(req, cltSocket, head)
    if (ret === false || ret === true) {
      return ret
    }
    // continue
  }
  return false
}

// create connectHandler function
module.exports = function createConnectHandler (sslConnectInterceptor, middlewares, fakeServerCenter, dnsConfig, sniConfig) {
  // return
  const sslConnectInterceptors = []
  sslConnectInterceptors.push(sslConnectInterceptor)
  for (const middleware of middlewares) {
    if (middleware.sslConnectInterceptor) {
      sslConnectInterceptors.push(middleware.sslConnectInterceptor)
    }
  }

  // log.info('sni config:', sniConfig)
  // const sniRegexpMap = matchUtil.domainMapRegexply(sniConfig)
  return function connectHandler (req, cltSocket, head) {
    // eslint-disable-next-line node/no-deprecated-api
    const { hostname, port } = url.parse(`https://${req.url}`)
    if (isSslConnect(sslConnectInterceptors, req, cltSocket, head)) {
      // 需要拦截，代替目标服务器，让客户端连接DS在本地启动的代理服务
      fakeServerCenter.getServerPromise(hostname, port).then((serverObj) => {
        log.info(`----- fakeServer connect: ${localIP}:${serverObj.port} ➜ ${req.url} -----`)
        connect(req, cltSocket, head, localIP, serverObj.port)
      }, (e) => {
        log.error(`----- fakeServer getServerPromise error: ${hostname}:${port}, error:`, e)
      })
    } else {
      log.info(`未匹配到任何 sslConnectInterceptors，不拦截请求，直接连接目标服务器: ${hostname}:${port}, headers:`, req.headers)
      connect(req, cltSocket, head, hostname, port, dnsConfig)
    }
  }
}

function connect (req, cltSocket, head, hostname, port, dnsConfig) {
  // tunneling https
  // log.info('connect:', hostname, port)
  const start = new Date()
  const isDnsIntercept = {}
  const hostport = `${hostname}:${port}`
  try {
    const options = {
      port,
      host: hostname,
      connectTimeout: 10000
    }
    if (dnsConfig && dnsConfig.providers) {
      const dns = DnsUtil.hasDnsLookup(dnsConfig, hostname)
      if (dns) {
        options.lookup = dnsLookup.createLookupFunc(null, dns, 'connect', hostport, isDnsIntercept)
      }
    }
    const proxySocket = net.connect(options, () => {
      cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: dev-sidecar\r\n' +
                '\r\n')
      log.info('Proxy connect start:', hostport)
      proxySocket.write(head)
      proxySocket.pipe(cltSocket)

      cltSocket.pipe(proxySocket)
    })
    cltSocket.on('timeout', (e) => {
      log.error(`cltSocket timeout: ${hostport}, errorMsg: ${e.message}`)
    })
    cltSocket.on('error', (e) => {
      log.error(`cltSocket error:   ${hostport}, errorMsg: ${e.message}`)
    })
    proxySocket.on('timeout', () => {
      const cost = new Date() - start
      const errorMsg = `代理连接超时: ${hostport}, cost: ${cost} ms`
      log.error(errorMsg)

      cltSocket.destroy()

      if (isDnsIntercept && isDnsIntercept.dns && isDnsIntercept.ip !== isDnsIntercept.hostname) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error(`记录ip失败次数，用于优选ip！ hostname: ${hostname}, ip: ${ip}, reason: ${errorMsg}, dns: ${dns.name}`)
      }
    })
    proxySocket.on('error', (e) => {
      // 连接失败，可能被GFW拦截，或者服务端拥挤
      const cost = new Date() - start
      const errorMsg = `代理连接失败: ${hostport}, cost: ${cost} ms, errorMsg: ${e.message}`
      log.error(errorMsg)

      cltSocket.destroy()

      if (isDnsIntercept && isDnsIntercept.dns && isDnsIntercept.ip !== isDnsIntercept.hostname) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error(`记录ip失败次数，用于优选ip！ hostname: ${hostname}, ip: ${ip}, reason: ${errorMsg}, dns: ${dns.name}`)
      }
    })
    return proxySocket
  } catch (e) {
    log.error(`Proxy connect error: ${hostport}, exception:`, e)
  }
}
