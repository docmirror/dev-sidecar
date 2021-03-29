const http = require('http')
const https = require('https')
const commonUtil = require('../common/util')
// const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i
const DnsUtil = require('../../dns/index')
const log = require('../../../utils/util.log')
const RequestCounter = require('../../choice/RequestCounter')
const InsertScriptMiddleware = require('../middleware/InsertScriptMiddleware')
const OverWallMiddleware = require('../middleware/overwall')
const speedTest = require('../../speed/index.js')
const defaultDns = require('dns')
const MAX_SLOW_TIME = 8000 // 超过此时间 则认为太慢了
// create requestHandler function
module.exports = function createRequestHandler (createIntercepts, middlewares, externalProxy, dnsConfig, setting) {
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
    const reqIncpts = interceptors.filter(item => { return item.requestIntercept != null })
    const resIncpts = interceptors.filter(item => { return item.responseIntercept != null })

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

    function countSlow (isDnsIntercept, type) {
      if (isDnsIntercept) {
        const { dns, ip, hostname } = isDnsIntercept
        dns.count(hostname, ip, true)
        log.error('记录ip失败次数,用于优选ip：', hostname, ip, type)
      }
      const counter = context.requestCount
      if (counter != null) {
        counter.count.doCount(counter.value, true)
        log.error('记录proxy失败次数：', counter.value, type)
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
          const start = new Date().getTime()
          log.info('代理请求:', url, rOptions.method)
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

          proxyReq = (rOptions.protocol === 'https:' ? https : http).request(rOptions, (proxyRes) => {
            const end = new Date().getTime()
            const cost = end - start
            if (rOptions.protocol === 'https:') {
              log.info('代理请求返回:', url, cost + 'ms')
            }
            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            }
            resolve(proxyRes)
          })

          proxyReq.on('timeout', () => {
            const end = new Date().getTime()
            const cost = end - start
            log.error('代理请求超时', rOptions.protocol, rOptions.hostname, rOptions.path, cost + 'ms')
            countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            proxyReq.end()
            proxyReq.destroy()
            const error = new Error(`${rOptions.host}:${rOptions.port}, 代理请求超时`)
            error.status = 408
            reject(error)
          })

          proxyReq.on('error', (e) => {
            const end = new Date().getTime()
            const cost = end - start
            log.error('代理请求错误', e.code, e.message, rOptions.hostname, rOptions.path, cost + 'ms')
            countSlow(isDnsIntercept, 'error:' + e.message)
            reject(e)
          })

          proxyReq.on('aborted', () => {
            const end = new Date().getTime()
            const cost = end - start
            log.error('代理请求被取消', rOptions.hostname, rOptions.path, cost + 'ms')

            if (cost > MAX_SLOW_TIME) {
              countSlow(isDnsIntercept, 'to slow  ' + cost + 'ms')
            }

            if (res.writableEnded) {
              return
            }
            reject(new Error('代理请求被取消'))
          })

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
        return false
      }

      const proxyRes = await proxyRequestPromise()

      // proxyRes.on('data', (chunk) => {
      //   // console.log('BODY: ')
      // })
      proxyRes.on('error', (error) => {
        countSlow(null, 'error:' + error.message)
        log.error('proxy res error', error)
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
              const append = resIncpt.responseIntercept(context, req, res, proxyReq, proxyRes, ssl)
              if (append && append.head) {
                head += append.head
              }
              if (append && append.body) {
                body += append.body
              }
            }
            InsertScriptMiddleware.responseInterceptor(req, res, proxyReq, proxyRes, ssl, next, { head, body })
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
          countSlow(null, 'status return :' + proxyRes.statusCode)
        }
        res.writeHead(proxyRes.statusCode)
        proxyRes.pipe(res)
      }
    })().catch(e => {
      if (!res.writableEnded) {
        const status = e.status || 500
        res.writeHead(status, { 'Content-Type': 'text/html;charset=UTF8' })
        res.write(`DevSidecar Warning:<br/> ${e.toString()}`)
        res.end()
        log.error('request error', e.message)
      }
    })
  }
}
