const http = require('http')
const https = require('https')
const commonUtil = require('../common/util')
// const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i
const DnsUtil = require('../../dns/index')

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
    const context = {}

    const requestInterceptorPromise = () => {
      return new Promise((resolve, reject) => {
        const next = () => {
          resolve()
        }
        try {
          if (typeof requestInterceptor === 'function') {
            requestInterceptor(rOptions, req, res, ssl, next, context)
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
      // if (dnsConfig) {
      //   const dns = DnsUtil.hasDnsLookup(dnsConfig, rOptions.host)
      //   if (dns) {
      //     const ip = await dns.lookup(rOptions.host)
      //     console.log('使用自定义dns:', rOptions.host, ip, dns.dnsServer)
      //     rOptions.host = ip
      //   }
      // }

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
          console.log('代理请求:', url, rOptions.method)
          let isDnsIntercept
          if (dnsConfig) {
            const dns = DnsUtil.hasDnsLookup(dnsConfig, rOptions.hostname)
            if (dns) {
              rOptions.lookup = (hostname, options, callback) => {
                dns.lookup(hostname).then(ip => {
                  isDnsIntercept = { dns, hostname, ip }
                  if (ip !== hostname) {
                    callback(null, ip, 4)
                  } else {
                    rOptions.lookup(hostname, options, callback)
                  }
                })
              }
            }
          }

          proxyReq = (rOptions.protocol === 'https:' ? https : http).request(rOptions, (proxyRes) => {
            const end = new Date().getTime()
            if (rOptions.protocol === 'https:') {
              console.log('代理请求返回:', url, (end - start) + 'ms')
            }
            resolve(proxyRes)
          })

          proxyReq.on('timeout', () => {
            const end = new Date().getTime()
            if (isDnsIntercept) {
              const { dns, ip, hostname } = isDnsIntercept
              dns.count(hostname, ip, true)
              console.error('记录ip失败次数,用于优选ip：', hostname, ip)
            }
            console.error('代理请求超时', rOptions.protocol, rOptions.hostname, rOptions.path, (end - start) + 'ms')
            reject(new Error(`${rOptions.host}:${rOptions.port}, 代理请求超时`))
          })

          proxyReq.on('error', (e) => {
            const end = new Date().getTime()
            if (isDnsIntercept) {
              const { dns, ip, hostname } = isDnsIntercept
              dns.count(hostname, ip, true)
              console.error('记录ip失败次数,用于优选ip：', hostname, ip)
            }
            console.error('代理请求错误', e.errno, rOptions.hostname, rOptions.path, (end - start) + 'ms', e)
            reject(e)
          })

          proxyReq.on('aborted', () => {
            console.error('代理请求被取消', rOptions.hostname, rOptions.path)
            reject(new Error('代理请求被取消'))
          })

          req.on('aborted', function () {
            console.error('请求被取消', rOptions.hostname, rOptions.path)
            proxyReq.abort()
            reject(new Error('请求被取消'))
          })
          req.on('error', function (e, req, res) {
            console.error('请求错误：', e.errno, rOptions.hostname, rOptions.path)
            reject(e)
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
            responseInterceptor(req, res, proxyReq, proxyRes, ssl, next, context)
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
          res.write(`DevSidecar Warning:\n\n ${e.toString()}`)
          res.end()
        }
        console.error('request error', e.message)
      }
    )
  }
}
