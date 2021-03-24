const net = require('net')
const url = require('url')
const log = require('../../../utils/util.log')
// const colors = require('colors')
const DnsUtil = require('../../dns/index')
const localIP = '127.0.0.1'
const defaultDns = require('dns')

const speedTest = require('../../speed/index.js')

function isSslConnect (sslConnectInterceptors, req, cltSocket, head) {
  for (const intercept of sslConnectInterceptors) {
    const ret = intercept(req, cltSocket, head)
    if (ret) {
      return true
    }
  }
  return false
}

// create connectHandler function
module.exports = function createConnectHandler (sslConnectInterceptor, middlewares, fakeServerCenter, dnsConfig) {
  // return
  const sslConnectInterceptors = []
  sslConnectInterceptors.push(sslConnectInterceptor)
  for (const middleware of middlewares) {
    if (middleware.sslConnectInterceptor) {
      sslConnectInterceptors.push(middleware.sslConnectInterceptor)
    }
  }
  return function connectHandler (req, cltSocket, head) {
    // eslint-disable-next-line node/no-deprecated-api
    const srvUrl = url.parse(`https://${req.url}`)
    const hostname = srvUrl.hostname
    if (isSslConnect(sslConnectInterceptors, req, cltSocket, head)) {
      fakeServerCenter.getServerPromise(hostname, srvUrl.port).then((serverObj) => {
        log.info('--- fakeServer connect', hostname)
        connect(req, cltSocket, head, localIP, serverObj.port)
      }, (e) => {
        log.error('getServerPromise', e)
      })
    } else {
      connect(req, cltSocket, head, hostname, srvUrl.port, dnsConfig)
    }
  }
}

function connect (req, cltSocket, head, hostname, port, dnsConfig) {
  // tunneling https
  // log.info('connect:', hostname, port)
  const start = new Date().getTime()
  let isDnsIntercept = null
  try {
    const options = {
      port,
      host: hostname,
      connectTimeout: 10000
    }
    if (dnsConfig) {
      const dns = DnsUtil.hasDnsLookup(dnsConfig, hostname)
      if (dns) {
        options.lookup = (hostname, options, callback) => {
          const tester = speedTest.getSpeedTester(hostname)
          if (tester) {
            const ip = tester.pickFastAliveIp()
            if (ip) {
              log.info(`-----${hostname} use alive ip:${ip}-----`)
              callback(null, ip, 4)
              return
            }
          }
          dns.lookup(hostname).then(ip => {
            isDnsIntercept = { dns, hostname, ip }
            if (ip !== hostname) {
              log.info(`-----${hostname} use ip:${ip}-----`)
              callback(null, ip, 4)
            } else {
              defaultDns.lookup(hostname, options, callback)
            }
          })
        }
      }
    }
    const proxySocket = net.connect(options, () => {
      cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: dev-sidecar\r\n' +
                '\r\n')

      proxySocket.write(head)
      proxySocket.pipe(cltSocket)

      cltSocket.pipe(proxySocket)
    })

    cltSocket.on('error', (e) => {
      log.error('cltSocket error', e.message)
    })
    proxySocket.on('timeout', () => {
      const end = new Date().getTime()
      log.info('代理socket timeout：', hostname, port, (end - start) + 'ms')
    })
    proxySocket.on('error', (e) => {
      // 连接失败，可能被GFW拦截，或者服务端拥挤
      const end = new Date().getTime()
      log.error('代理连接失败：', e.message, hostname, port, (end - start) + 'ms')
      cltSocket.destroy()
      if (isDnsIntercept) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error('记录ip失败次数,用于优选ip：', hostname, ip)
      }
    })
    return proxySocket
  } catch (error) {
    log.error('connect err', error)
  }
}
