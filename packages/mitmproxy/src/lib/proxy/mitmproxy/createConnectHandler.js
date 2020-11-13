const net = require('net')
const url = require('url')
const log = require('../../../utils/util.log')
// const colors = require('colors')
const DnsUtil = require('../../dns/index')
const localIP = '127.0.0.1'
const defaultDns = require('dns')
// create connectHandler function
module.exports = function createConnectHandler (sslConnectInterceptor, fakeServerCenter, dnsConfig) {
  // return
  return function connectHandler (req, cltSocket, head) {
    // eslint-disable-next-line node/no-deprecated-api
    const srvUrl = url.parse(`https://${req.url}`)
    const hostname = srvUrl.hostname
    if (typeof sslConnectInterceptor === 'function' && sslConnectInterceptor(req, cltSocket, head)) {
      fakeServerCenter.getServerPromise(hostname, srvUrl.port).then((serverObj) => {
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
          dns.lookup(hostname).then(ip => {
            isDnsIntercept = { dns, hostname, ip }
            if (ip !== hostname) {
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
