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
        console.error('getServerPromise', e)
      })
    } else {
      if (dnsConfig) {
        const dns = DnsUtil.hasDnsLookup(dnsConfig, hostname)
        if (dns) {
          dns.lookup(hostname).then(ip => {
            connect(req, cltSocket, head, ip, srvUrl.port, { dns, hostname, ip })
          })
        }
      }
      connect(req, cltSocket, head, hostname, srvUrl.port)
    }
  }
}

function connect (req, cltSocket, head, hostname, port, isDnsIntercept) {
  // tunneling https
  // console.log('connect:', hostname, port)
  const start = new Date().getTime()
  try {
    const proxySocket = net.connect({ port, host: hostname, connectTimeout: 5000 }, () => {
      cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: dev-sidecar\r\n' +
                '\r\n')

      proxySocket.write(head)
      proxySocket.pipe(cltSocket)

      cltSocket.pipe(proxySocket)
    })

    proxySocket.on('timeout', () => {
      const end = new Date().getTime()
      console.log('代理socket timeout：', hostname, port, (end - start) + 'ms')
      proxySocket.destroy()
      cltSocket.destroy()
    })
    proxySocket.on('error', (e) => {
      // 连接失败，可能被GFW拦截，或者服务端拥挤
      const end = new Date().getTime()
      console.error('代理连接失败：', e.message, hostname, port, (end - start) + 'ms')
      cltSocket.destroy()

      if (isDnsIntercept) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        console.error('记录ip失败次数,用于优选ip：', hostname, ip)
      }
    })
    return proxySocket
  } catch (error) {
    console.log('connect err', error)
  }
}
