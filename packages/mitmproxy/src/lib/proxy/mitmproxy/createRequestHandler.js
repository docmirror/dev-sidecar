const http = require('http')
const https = require('https')
const commonUtil = require('../common/util')
const jsonApi = require('../../../json')
// const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i
const DnsUtil = require('../../dns/index')
const log = require('../../../utils/util.log')
const RequestCounter = require('../../choice/RequestCounter')
const InsertScriptMiddleware = require('../middleware/InsertScriptMiddleware')
const dnsLookup = require('./dnsLookup')
const MAX_SLOW_TIME = 8000 // 超过此时间 则认为太慢了

// create requestHandler function
module.exports = function createRequestHandler (createIntercepts, middlewares, externalProxy, dnsConfig, setting) {
  // return
  return function requestHandler (req, res, ssl) {
    let proxyReq

    const rOptions = commonUtil.getOptionsFromRequest(req, ssl, externalProxy, setting)
    let url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}`

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
                if (goNext !== 'no-next') next()
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
      if (isDnsIntercept && isDnsIntercept.dns && isDnsIntercept.ip !== isDnsIntercept.hostname) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error(`记录ip失败次数，用于优选ip！ hostname: ${hostname}, ip: ${ip}, reason: ${reason}, dns: ${dns.name}`)
      }
      const counter = context.requestCount
      if (counter != null) {
        counter.count.doCount(counter.value, true)
        log.error(`记录Proxy请求失败次数，用于切换备选域名！ hostname: ${counter.value}, reason: ${reason}, counter.count:`, counter.count)
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
          url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${rOptions.path}`
          const start = new Date()
          log.info('发起代理请求:', url, (rOptions.servername ? ', sni: ' + rOptions.servername : ''), ', headers:', rOptions.headers)

          const isDnsIntercept = {}
          if (dnsConfig && dnsConfig.providers) {
            let dns = DnsUtil.hasDnsLookup(dnsConfig, rOptions.hostname)
            if (!dns && rOptions.servername) {
              dns = dnsConfig.providers.quad9
              if (dns) {
                log.info(`域名 ${rOptions.hostname} 在dns中未配置，但使用了 sni: ${rOptions.servername}, 必须使用dns，现默认使用 'quad9' DNS.`)
              }
            }
            if (dns) {
              rOptions.lookup = dnsLookup.createLookupFunc(res, dns, 'request url', url, isDnsIntercept)
            }
          }

          // rOptions.sigalgs = 'RSA-PSS+SHA256:RSA-PSS+SHA512:ECDSA+SHA256'
          // rOptions.agent.options.sigalgs = rOptions.sigalgs
          // rOptions.ciphers = 'TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA256:ECDHE-RSA-AES256-SHA256:HIGH'
          // rOptions.agent.options.ciphers = rOptions.ciphers
          // log.debug('rOptions:', rOptions.hostname + rOptions.path, '\r\n', rOptions)
          // log.debug('agent:', rOptions.agent)
          // log.debug('agent.options:', rOptions.agent.options)
          res.setHeader('DS-Proxy-Request', rOptions.hostname)
          proxyReq = (rOptions.protocol === 'https:' ? https : http).request(rOptions, (proxyRes) => {
            const cost = new Date() - start
            if (rOptions.protocol === 'https:') {
              log.info(`代理请求返回: ${url}, cost: ${cost} ms`)
            } else {
              log.info(`请求返回: ${url}, cost: ${cost} ms`)
            }
            // console.log('request:', proxyReq, proxyReq.socket)

            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, `代理请求成功但太慢, cost: ${cost} ms > ${MAX_SLOW_TIME} ms`)
            }

            resolve(proxyRes)
          })

          // 代理请求的事件监听
          proxyReq.on('timeout', () => {
            const cost = new Date() - start
            const errorMsg = `代理请求超时: ${url}, cost: ${cost} ms`
            log.error(errorMsg, ', rOptions:', jsonApi.stringify2(rOptions))
            countSlow(isDnsIntercept, `代理请求超时, cost: ${cost} ms`)
            proxyReq.end()
            proxyReq.destroy()
            const error = new Error(errorMsg)
            error.status = 408
            reject(error)
          })
          proxyReq.on('error', (e) => {
            const cost = new Date() - start
            log.error(`代理请求错误: ${url}, cost: ${cost} ms, error:`, e, ', rOptions:', jsonApi.stringify2(rOptions))
            countSlow(isDnsIntercept, '代理请求错误: ' + e.message)
            reject(e)
          })
          proxyReq.on('aborted', () => {
            const cost = new Date() - start
            const errorMsg = `代理请求被取消: ${url}, cost: ${cost} ms`
            log.error(errorMsg, ', rOptions:', jsonApi.stringify2(rOptions))

            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, `代理请求被取消，且请求太慢, cost: ${cost} ms > ${MAX_SLOW_TIME} ms`)
            }

            if (res.writableEnded) {
              return
            }
            reject(new Error(errorMsg))
          })

          // 原始请求的事件监听
          req.on('aborted', function () {
            const cost = new Date() - start
            const errorMsg = `请求被取消: ${url}, cost: ${cost} ms`
            log.error(errorMsg, ', rOptions:', jsonApi.stringify2(rOptions))
            proxyReq.abort()
            if (res.writableEnded) {
              return
            }
            reject(new Error(errorMsg))
          })
          req.on('error', function (e, req, res) {
            const cost = new Date() - start
            log.error(`请求错误: ${url}, cost: ${cost} ms, error:`, e, ', rOptions:', jsonApi.stringify2(rOptions))
            reject(e)
          })
          req.on('timeout', () => {
            const cost = new Date() - start
            const errorMsg = `请求超时: ${url}, cost: ${cost} ms`
            log.error(errorMsg, ', rOptions:', jsonApi.stringify2(rOptions))
            reject(new Error(errorMsg))
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
        log.error(`proxy res error: ${url}, error:`, error)
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

        // region 忽略部分已经打印过ERROR日志的错误
        if (e.message) {
          const ignoreErrors = [
            '代理请求错误: ',
            '代理请求超时: ',
            '代理请求被取消: '
          ]
          for (const ignoreError of ignoreErrors) {
            if (e.message.startsWith(ignoreError)) {
              return
            }
          }
        }
        // endregion

        log.error(`Request error: ${url}, error:`, e)
      }
    })
  }
}
