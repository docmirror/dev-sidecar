const http = require('http')
const https = require('https')
const commonUtil = require('../common/util')
// const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i
const DnsUtil = require('../../dns/index')

// create requestHandler function
module.exports = function createRequestHandler (requestInterceptor, responseInterceptor, middlewares, externalProxy, dnsConfig) {
  // return
  return function requestHandler (req, res, ssl) {
    let proxyReq

    const rOptions = commonUtil.getOptionsFormRequest(req, ssl, externalProxy)
    if (rOptions.headers.connection === 'close') {
      req.socket.setKeepAlive(false)
    } else if (rOptions.customSocketId != null) { // for NTLM
      req.socket.setKeepAlive(true, 60 * 60 * 1000)
    } else {
      req.socket.setKeepAlive(true, 30000)
    }

    const requestInterceptorPromise = () => {
      return new Promise((resolve, reject) => {
        const next = () => {
          resolve()
        }
        try {
          if (typeof requestInterceptor === 'function') {
            requestInterceptor(rOptions, req, res, ssl, next)
          } else {
            resolve()
          }
        } catch (e) {
          reject(e)
        }
      })
    }

    const proxyRequestPromise = async () => {
      rOptions.host = rOptions.hostname || rOptions.host || 'localhost'
      if (dnsConfig) {
        const dns = DnsUtil.hasDnsLookup(dnsConfig, rOptions.host)
        if (dns) {
          const ip = await dns.lookup(rOptions.host)
          console.log('使用自定义dns:', rOptions.host, ip, dns.dnsServer)
          rOptions.host = ip
        }
      }

      return new Promise((resolve, reject) => {
        // use the binded socket for NTLM
        if (rOptions.agent && rOptions.customSocketId != null && rOptions.agent.getName) {
          const socketName = rOptions.agent.getName(rOptions)
          const bindingSocket = rOptions.agent.sockets[socketName]
          if (bindingSocket && bindingSocket.length > 0) {
            bindingSocket[0].once('free', onFree)
            return
          }
        }
        onFree()

        function onFree () {
          const url = `${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}`
          const start = new Date().getTime()
          console.log('代理请求:', url)

          proxyReq = (rOptions.protocol === 'https:' ? https : http).request(rOptions, (proxyRes) => {
            const end = new Date().getTime()
            if (rOptions.protocol === 'https:') {
              console.log('代理请求返回:', url, (end - start) + 'ms')
            }
            resolve(proxyRes)
          })

          proxyReq.on('timeout', () => {
            console.error('代理请求超时', rOptions.hostname, rOptions.path)
            reject(new Error(`${rOptions.host}:${rOptions.port}, 代理请求超时`))
          })

          proxyReq.on('error', (e, req, res) => {
            console.error('代理请求错误', e.errno, rOptions.hostname, rOptions.path)
            reject(e)
            if (res) {
              res.end()
            }
          })

          proxyReq.on('aborted', () => {
            console.error('代理请求被取消', rOptions.hostname, rOptions.path)
            reject(new Error('代理请求被取消'))
            req.destroy()
          })

          req.on('aborted', function () {
            console.error('请求被取消', rOptions.hostname, rOptions.path)
            proxyReq.destroy()
            reject(new Error('请求被取消'))
          })
          req.on('error', function (e, req, res) {
            console.error('请求错误：', e.errno, rOptions.hostname, rOptions.path)
            reject(e)
            if (res) {
              res.end()
            }
          })
          req.on('timeout', () => {
            console.error('请求超时', rOptions.hostname, rOptions.path)
            reject(new Error(`${rOptions.hostname}:${rOptions.port}, 请求超时`))
          })
          req.pipe(proxyReq)
        }
      })
    }

    // workflow control
    (async () => {
      await requestInterceptorPromise()

      if (res.finished) {
        return false
      }

      const proxyRes = await proxyRequestPromise()

      const responseInterceptorPromise = new Promise((resolve, reject) => {
        const next = () => {
          resolve()
        }
        try {
          if (typeof responseInterceptor === 'function') {
            responseInterceptor(req, res, proxyReq, proxyRes, ssl, next)
          } else {
            resolve()
          }
        } catch (e) {
          reject(e)
        }
      })

      await responseInterceptorPromise

      if (res.finished) {
        return false
      }

      if (!res.headersSent) { // prevent duplicate set headers
        Object.keys(proxyRes.headers).forEach(function (key) {
          if (proxyRes.headers[key] !== undefined) {
            // https://github.com/nodejitsu/node-http-proxy/issues/362
            if (/^www-authenticate$/i.test(key)) {
              if (proxyRes.headers[key]) {
                proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',')
              }
              key = 'www-authenticate'
            }
            res.setHeader(key, proxyRes.headers[key])
          }
        })

        res.writeHead(proxyRes.statusCode)
        proxyRes.pipe(res)
      }
    })().then(
      (flag) => {
        // do nothing
      },
      (e) => {
        if (!res.finished) {
          res.writeHead(500)
          res.write(`Dev-Sidecar Warning:\n\n ${e.toString()}`)
          res.end()
        }
        console.error(e)
      }
    )
  }
}
