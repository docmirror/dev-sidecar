const http = require('http')
const https = require('https')
const commonUtil = require('../common/util')
// const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i
const DnsUtil = require('../../dns/index')
const log = require('../../../utils/util.log')
const RequestCounter = require('../../choice/RequestCounter')
const InsertScriptMiddleware = require('../middleware/InsertScriptMiddleware')
const speedTest = require('../../speed/index.js')
const defaultDns = require('dns')
const MAX_SLOW_TIME = 8000 // 超过此时间 则认为太慢了
// create requestHandler function
module.exports = function createRequestHandler (createIntercepts, middlewares, externalProxy, dnsConfig, setting) {
  // return
  return function requestHandler (req, res, ssl) {
    let proxyReq

    const rOptions = commonUtil.getOptionsFromRequest(req, ssl, externalProxy)

    if (rOptions.agent) {
      rOptions.agent.options.rejectUnauthorized = setting.verifySsl
    } else if (rOptions.agent !== false) {
      log.error('rOptions.agent 的值有问题:', rOptions)
    }

    if (rOptions.headers.connection === 'close') {
      req.socket.setKeepAlive(false)
    } else if (rOptions.customSocketId != null) { // for NTLM
      req.socket.setKeepAlive(true, 60 * 60 * 1000)
    } else {
      req.socket.setKeepAlive(true, 30000)
    }
    const context = {
      rOptions,
      log,
      RequestCounter,
      setting
    }
    let interceptors = createIntercepts(context)
    if (interceptors == null) {
      interceptors = []
    }
    const reqIncpts = interceptors.filter(item => {
      return item.requestIntercept != null
    })
    const resIncpts = interceptors.filter(item => {
      return item.responseIntercept != null
    })

    const requestInterceptorPromise = () => {
      return new Promise((resolve, reject) => {
        const next = () => {
          resolve()
        }
        try {
          if (setting.script.enabled) {
            reqIncpts.unshift(InsertScriptMiddleware)
          }
          for (const middleware of middlewares) {
            reqIncpts.push(middleware)
          }
          if (reqIncpts && reqIncpts.length > 0) {
            for (const reqIncpt of reqIncpts) {
              if (!reqIncpt.requestIntercept) {
                continue
              }
              const goNext = reqIncpt.requestIntercept(context, req, res, ssl, next)
              if (goNext) {
                next()
                return
              }
            }
            next()
          } else {
            next()
          }
        } catch (e) {
          reject(e)
        }
      })
    }

    function countSlow (isDnsIntercept, reason) {
      if (isDnsIntercept) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error('记录ip失败次数,用于优选ip：', hostname, ip, reason)
      }
      const counter = context.requestCount
      if (counter != null) {
        counter.count.doCount(counter.value, true)
        log.error('记录proxy失败次数：', counter.value, reason)
      }
    }

    const proxyRequestPromise = async () => {
      rOptions.host = rOptions.hostname || rOptions.host || 'localhost'
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
          const start = new Date()
          log.info('代理请求:', url, rOptions.method, rOptions.servername ? ', sni: ' + rOptions.servername : '')
          let isDnsIntercept
          if (dnsConfig) {
            const dns = DnsUtil.hasDnsLookup(dnsConfig, rOptions.hostname)
            if (dns) {
              rOptions.lookup = (hostname, options, callback) => {
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
                    log.info(`----request url :${url},use ip :${ip}----`)
                    callback(null, ip, 4)
                  } else {
                    log.info(`request url :${url},use hostname :${hostname}`)
                    defaultDns.lookup(hostname, options, callback)
                  }
                })
              }
            }
          }

          // rOptions.sigalgs = 'RSA-PSS+SHA256:RSA-PSS+SHA512:ECDSA+SHA256'
          // rOptions.agent.options.sigalgs = rOptions.sigalgs
          // rOptions.ciphers = 'TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA256:ECDHE-RSA-AES256-SHA256:HIGH'
          // rOptions.agent.options.ciphers = rOptions.ciphers
          // log.debug('rOptions:', rOptions.hostname + rOptions.path, '\r\n', rOptions)
          // log.debug('agent:', rOptions.agent)
          // log.debug('agent.options:', rOptions.agent.options)
          proxyReq = (rOptions.protocol === 'https:' ? https : http).request(rOptions, (proxyRes) => {
            const cost = new Date() - start
            if (rOptions.protocol === 'https:') {
              log.info('代理请求返回:', url, cost + 'ms')
            }
            // console.log('request:', proxyReq, proxyReq.socket)
            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            }
            resolve(proxyRes)
          })

          // 代理请求的事件监听
          proxyReq.on('timeout', () => {
            const cost = new Date() - start
            log.error('代理请求超时', rOptions.protocol, rOptions.hostname, rOptions.path, cost + 'ms')
            countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            proxyReq.end()
            proxyReq.destroy()
            const error = new Error(`${rOptions.host}:${rOptions.port}, 代理请求超时`)
            error.status = 408
            reject(error)
          })
          proxyReq.on('error', (e) => {
            const cost = new Date() - start
            log.error('代理请求错误', e.code, e.message, rOptions.hostname, rOptions.path, cost + 'ms')
            countSlow(isDnsIntercept, 'error:' + e.message)
            reject(e)
          })
          proxyReq.on('aborted', () => {
            const cost = new Date() - start
            log.error('代理请求被取消', rOptions.hostname, rOptions.path, cost + 'ms')

            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            }

            if (res.writableEnded) {
              return
            }
            reject(new Error('代理请求被取消'))
          })

          // 原始请求的事件监听
          req.on('aborted', function () {
            log.error('请求被取消', rOptions.hostname, rOptions.path)
            proxyReq.abort()
            if (res.writableEnded) {
              return
            }
            reject(new Error('请求被取消'))
          })
          req.on('error', function (e, req, res) {
            log.error('请求错误：', e.errno, rOptions.hostname, rOptions.path)
            reject(e)
          })
          req.on('timeout', () => {
            log.error('请求超时', rOptions.hostname, rOptions.path)
            reject(new Error(`${rOptions.hostname}:${rOptions.port}, 请求超时`))
          })
          req.pipe(proxyReq)
        }
      })
    }

    // workflow control
    (async () => {
      await requestInterceptorPromise()

      if (res.writableEnded) {
        // log.info('res is writableEnded, return false')
        return false
      }

      const proxyRes = await proxyRequestPromise()

      // proxyRes.on('data', (chunk) => {
      //   // console.log('BODY: ')
      // })
      proxyRes.on('error', (error) => {
        countSlow(null, 'error: ' + error.message)
        log.error('proxy res error:', error)
      })

      const responseInterceptorPromise = new Promise((resolve, reject) => {
        const next = () => {
          resolve()
        }
        for (const middleware of middlewares) {
          if (middleware.responseInterceptor) {
            middleware.responseInterceptor(req, res, proxyReq, proxyRes, ssl, next)
          }
        }
        if (!setting.script.enabled) {
          next()
          return
        }
        try {
          if (resIncpts && resIncpts.length > 0) {
            let head = ''
            let body = ''
            for (const resIncpt of resIncpts) {
              const append = resIncpt.responseIntercept(context, req, res, proxyReq, proxyRes, ssl, next)
              // 判断是否已经关闭
              if (res.writableEnded) {
                next()
                return
              }
              if (append) {
                if (append.head) {
                  head += append.head
                }
                if (append.body) {
                  body += append.body
                }
              } else if (append === false) {
                break // 返回false表示终止拦截器，跳出循环
              }
            }
            InsertScriptMiddleware.responseInterceptor(req, res, proxyReq, proxyRes, ssl, next, {
              head,
              body
            })
          } else {
            next()
          }
        } catch (e) {
          reject(e)
        }
      })

      await responseInterceptorPromise

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

        if (proxyRes.statusCode >= 400) {
          countSlow(null, 'Status return: ' + proxyRes.statusCode)
        }
        res.writeHead(proxyRes.statusCode)
        proxyRes.pipe(res)
      }
    })().catch(e => {
      if (!res.writableEnded) {
        try {
          const status = e.status || 500
          res.writeHead(status, { 'Content-Type': 'text/html;charset=UTF8' })
          res.write(`DevSidecar Error:<br/>
目标网站请求错误：【${e.code}】 ${e.message}<br/>
目标地址：${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}`
          )
        } catch (e) {
          // do nothing
        }

        try {
          res.end()
        } catch (e) {
          // do nothing
        }

        log.error('Request error:', e)
      }
    })
  }
}
