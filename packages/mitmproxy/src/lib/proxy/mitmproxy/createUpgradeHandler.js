const http = require('http')
const https = require('https')
const util = require('../common/util')
const log = require('../../../utils/util.log')
// copy from node-http-proxy.  ^_^

// create connectHandler function
module.exports = function createUpgradeHandler () {
  // return
  return function upgradeHandler (req, cltSocket, head, ssl) {
    const clientOptions = util.getOptionsFormRequest(req, ssl)
    const proxyReq = (ssl ? https : http).request(clientOptions)
    proxyReq.on('error', (e) => {
      log.error('upgradeHandler', e)
    })
    proxyReq.on('response', function (res) {
      // if upgrade event isn't going to happen, close the socket
      if (!res.upgrade) cltSocket.end()
    })

    proxyReq.on('upgrade', function (proxyRes, proxySocket, proxyHead) {
      proxySocket.on('error', (e) => {
        log.error('on upgrade:', e)
      })

      cltSocket.on('error', function (e) {
        log.error('upgrade socket ', e)
        proxySocket.end()
      })

      proxySocket.setTimeout(0)
      proxySocket.setNoDelay(true)

      proxySocket.setKeepAlive(true, 0)

      if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead)

      cltSocket.write(
        Object.keys(proxyRes.headers).reduce(function (head, key) {
          const value = proxyRes.headers[key]

          if (!Array.isArray(value)) {
            head.push(key + ': ' + value)
            return head
          }

          for (let i = 0; i < value.length; i++) {
            head.push(key + ': ' + value[i])
          }
          return head
        }, ['HTTP/1.1 101 Switching Protocols'])
          .join('\r\n') + '\r\n\r\n'
      )

      proxySocket.pipe(cltSocket).pipe(proxySocket)
    })
    proxyReq.end()
  }
}
