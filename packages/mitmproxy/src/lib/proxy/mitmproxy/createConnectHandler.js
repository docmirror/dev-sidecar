const net = require('net')
const url = require('url')
// const colors = require('colors')
const DnsUtil = require('../../dns/index')
const localIP = '127.0.0.1'
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
        console.error(e)
      })
    } else {
      if (dnsConfig) {
        const dns = DnsUtil.hasDnsLookup(dnsConfig, hostname)
        if (dns) {
          dns.lookup(hostname).then(ip => {
            connect(req, cltSocket, head, ip, srvUrl.port)
          })
        }
      }
      connect(req, cltSocket, head, hostname, srvUrl.port)
    }
  }
}

function connect (req, cltSocket, head, hostname, port) {
  // tunneling https
  // console.log('connect:', hostname, port)
  try {
    const proxySocket = net.connect(port, hostname, () => {
      cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: dev-sidecar\r\n' +
                '\r\n')

      proxySocket.write(head)
      proxySocket.pipe(cltSocket)

      cltSocket.pipe(proxySocket)
    })
    proxySocket.on('error', (e) => {
      // 连接失败，可能被GFW拦截，或者服务端拥挤
      console.error('代理连接失败：', e.errno, hostname, port)
      cltSocket.destroy()
    })
    return proxySocket
  } catch (error) {
    console.log('err', error)
  }
}
