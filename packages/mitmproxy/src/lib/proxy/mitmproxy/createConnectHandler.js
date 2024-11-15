const net = require('net')
const url = require('url')
const jsonApi = require('../../../json')
const log = require('../../../utils/util.log')
const DnsUtil = require('../../dns/index')
const dnsLookup = require('./dnsLookup')

const localIP = '127.0.0.1'

function isSslConnect (sslConnectInterceptors, req, cltSocket, head) {
  for (const intercept of sslConnectInterceptors) {
    const ret = intercept(req, cltSocket, head)
    log.debug('当前拦截器返回结果：', ret, `, url: ${req.url}, intercept:`, intercept)
    if (ret == null) {
      continue
    }
    return !(ret === false || ret === 'false')
  }
  return false
}

// create connectHandler function
module.exports = function createConnectHandler (sslConnectInterceptor, middlewares, fakeServerCenter, dnsConfig, compatibleConfig) {
  // return
  const sslConnectInterceptors = []
  sslConnectInterceptors.push(sslConnectInterceptor)
  for (const middleware of middlewares) {
    if (middleware.sslConnectInterceptor) {
      sslConnectInterceptors.push(middleware.sslConnectInterceptor)
    }
  }

  return function connectHandler (req, cltSocket, head, ssl) {
    // eslint-disable-next-line node/no-deprecated-api
    let { hostname, port } = url.parse(`${ssl ? 'https' : 'http'}://${req.url}`)
    port = Number.parseInt(port)

    if (isSslConnect(sslConnectInterceptors, req, cltSocket, head)) {
      // 需要拦截，代替目标服务器，让客户端连接DS在本地启动的代理服务
      fakeServerCenter.getServerPromise(hostname, port, ssl, compatibleConfig).then((serverObj) => {
        log.info(`----- fakeServer connect: ${localIP}:${serverObj.port} ➜ ${req.url} -----`)
        connect(req, cltSocket, head, localIP, serverObj.port)
      }, (e) => {
        log.error(`----- fakeServer getServerPromise error: ${hostname}:${port}, error:`, e)
      }).catch((e) => {
        log.error(`----- fakeServer getServerPromise error: ${hostname}:${port}, error:`, e)
      })
    } else {
      log.info(`不拦截请求，直连目标服务器: ${hostname}:${port}, headers:`, jsonApi.stringify2(req.headers))
      connect(req, cltSocket, head, hostname, port, dnsConfig, true)
    }
  }
}

function connect (req, cltSocket, head, hostname, port, dnsConfig = null, isDirect = false) {
  // tunneling https
  // log.info('connect:', hostname, port)
  const start = new Date()
  const isDnsIntercept = {}
  const hostport = `${hostname}:${port}`
  try {
    // 客户端的连接事件监听
    cltSocket.on('timeout', (e) => {
      log.error(`cltSocket timeout: ${hostport}, errorMsg: ${e.message}`)
    })
    cltSocket.on('error', (e) => {
      log.error(`cltSocket error:   ${hostport}, errorMsg: ${e.message}`)
    })
    // 开发过程中，如有需要可以将此参数临时改为true，打印所有事件的日志
    const printDebugLog = false && process.env.NODE_ENV === 'development'
    if (printDebugLog) {
      cltSocket.on('close', (hadError) => {
        log.debug('【cltSocket close】', hadError)
      })
      cltSocket.on('connect', () => {
        log.debug('【cltSocket connect】')
      })
      cltSocket.on('connectionAttempt', (ip, port, family) => {
        log.debug(`【cltSocket connectionAttempt】${ip}:${port}, family:`, family)
      })
      cltSocket.on('connectionAttemptFailed', (ip, port, family) => {
        log.debug(`【cltSocket connectionAttemptFailed】${ip}:${port}, family:`, family)
      })
      cltSocket.on('connectionAttemptTimeout', (ip, port, family) => {
        log.debug(`【cltSocket connectionAttemptTimeout】${ip}:${port}, family:`, family)
      })
      cltSocket.on('data', (data) => {
        log.debug('【cltSocket data】')
      })
      cltSocket.on('drain', () => {
        log.debug('【cltSocket drain】')
      })
      cltSocket.on('end', () => {
        log.debug('【cltSocket end】')
      })
      // cltSocket.on('lookup', (err, address, family, host) => {
      // })
      cltSocket.on('ready', () => {
        log.debug('【cltSocket ready】')
      })
    }

    // ---------------------------------------------------------------------------------------------------

    const options = {
      port,
      host: hostname,
      connectTimeout: 10000
    }
    if (dnsConfig && dnsConfig.dnsMap) {
      const dns = DnsUtil.hasDnsLookup(dnsConfig, hostname)
      if (dns) {
        options.lookup = dnsLookup.createLookupFunc(null, dns, 'connect', hostport, isDnsIntercept)
      }
    }
    // 代理连接事件监听
    const proxySocket = net.connect(options, () => {
      if (!isDirect) log.info('Proxy connect start:', hostport)
      else log.debug('Direct connect start:', hostport)

      cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: dev-sidecar\r\n' +
                '\r\n')
      proxySocket.write(head)
      proxySocket.pipe(cltSocket)

      cltSocket.pipe(proxySocket)
    })
    proxySocket.on('timeout', () => {
      const cost = new Date() - start
      const errorMsg = `${isDirect ? '直连' : '代理连接'}超时: ${hostport}, cost: ${cost} ms`
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
      const errorMsg = `${isDirect ? '直连' : '代理连接'}失败: ${hostport}, cost: ${cost} ms, errorMsg: ${e.message}`
      log.error(`${errorMsg}\r\n`, e)

      cltSocket.destroy()

      if (isDnsIntercept && isDnsIntercept.dns && isDnsIntercept.ip !== isDnsIntercept.hostname) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error(`记录ip失败次数，用于优选ip！ hostname: ${hostname}, ip: ${ip}, reason: ${errorMsg}, dns: ${dns.name}`)
      }
    })

    if (printDebugLog) {
      proxySocket.on('close', (hadError) => {
        log.debug('【proxySocket close】', hadError)
      })
      proxySocket.on('connect', () => {
        log.debug('【proxySocket connect】')
      })
      proxySocket.on('connectionAttempt', (ip, port, family) => {
        log.debug(`【proxySocket connectionAttempt】${ip}:${port}, family:`, family)
      })
      proxySocket.on('connectionAttemptFailed', (ip, port, family) => {
        log.debug(`【proxySocket connectionAttemptFailed】${ip}:${port}, family:`, family)
      })
      proxySocket.on('connectionAttemptTimeout', (ip, port, family) => {
        log.debug(`【proxySocket connectionAttemptTimeout】${ip}:${port}, family:`, family)
      })
      proxySocket.on('data', (data) => {
        log.debug('【proxySocket data】')
      })
      proxySocket.on('drain', () => {
        log.debug('【proxySocket drain】')
      })
      proxySocket.on('end', () => {
        log.debug('【proxySocket end】')
      })
      // proxySocket.on('lookup', (err, address, family, host) => {
      // })
      proxySocket.on('ready', () => {
        log.debug('【proxySocket ready】')
      })
    }

    return proxySocket
  } catch (e) {
    log.error(`${isDirect ? '直连' : '代理连接'}错误: ${hostport}, error:`, e)
  }
}
