const http = require('node:http')
const https = require('node:https')
const tls = require('node:tls')
const forge = require('node-forge')
const { LRUCache } = require('lru-cache')
const CertAndKeyContainer = require('./CertAndKeyContainer')
const log = require('../../../utils/util.log.server')
const compatible = require('../compatible/compatible')

const pki = forge.pki

// IPv4地址检测正则，提前编译，避免在 getDnsName 中重复创建。
// 不使用 /g 标志：此处只做存在性检测（.test()），无需记录 lastIndex 状态。
const IPv4_RE = /\b(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\b){3}/

// 获取DNS名称
function getDnsName (hostname) {
  if (!hostname.includes('.')) {
    return hostname // 可能是IPv6地址，直接返回
  }

  // 判断是否为IP
  if (IPv4_RE.test(hostname)) {
    return hostname // 为IP，直接返回
  }

  // 判断是否是一级域名
  if (hostname.indexOf('.') === hostname.lastIndexOf('.')) {
    return `*.${hostname}`
  }

  // 获取域名
  return `*${hostname.substring(hostname.indexOf('.'))}`
}

const DEFAULT_MAX_LENGTH = 256

module.exports = class FakeServersCenter {
  constructor ({
    maxLength = DEFAULT_MAX_LENGTH,
    requestHandler,
    upgradeHandler,
    caCert,
    caKey,
  }) {
    // 缓存键格式：`${dnsName}:${port}:${ssl}`
    this.cache = new LRUCache({
      maxSize: maxLength > 0 ? maxLength : DEFAULT_MAX_LENGTH,
      sizeCalculation: () => {
        return 1
      },
      dispose: (evictServerPromiseObj, evictDnsName) => {
        try {
          evictServerPromiseObj.serverObj.server.close()
          log.info(`旧fake服务缓存被移除，停止服务成功，${evictDnsName}`)
        } catch (e) {
          log.error(`旧fake服务缓存被移除，但停止服务失败，${evictDnsName} ->`, evictServerPromiseObj, `, error:`, e)
        }
      },
    })
    this.requestHandler = requestHandler
    this.upgradeHandler = upgradeHandler
    this.certAndKeyContainer = new CertAndKeyContainer({
      maxLength: maxLength > 0 ? maxLength : DEFAULT_MAX_LENGTH,
      caCert,
      caKey,
    })
  }

  addServerPromise (serverPromiseObj) {
    // 添加缓存
    this.cache.set(serverPromiseObj.cacheKey, serverPromiseObj)
  }

  getServerPromise (hostname, port, ssl, manualCompatibleConfig) {
    if (port === 443 || port === 80) {
      ssl = port === 443
    } else if (ssl) {
      // 自动兼容程序：1
      const compatibleConfig = compatible.getConnectCompatibleConfig(hostname, port, manualCompatibleConfig)
      if (compatibleConfig && compatibleConfig.ssl != null) {
        ssl = compatibleConfig.ssl
      }
    }

    log.info(`getServerPromise, hostname: ${hostname}:${port}, ssl: ${ssl}, protocol: ${ssl ? 'https' : 'http'}`)

    const dnsName = getDnsName(hostname)
    const cacheKey = `${dnsName}:${port}:${ssl}`

    const cachedServerObj = this.cache.get(cacheKey)
    if (cachedServerObj) {
      log.info(`Load fakeServerPromise from cache, hostname: ${hostname}:${port}, ssl: ${ssl}, serverPromiseObj: {"ssl":${cachedServerObj.ssl},"port":${cachedServerObj.port},"mappingHostNames":${JSON.stringify(cachedServerObj.mappingHostNames)}}`)
      return cachedServerObj.promise
    }

    const mappingHostNames = [dnsName]
    if (dnsName.startsWith('*.')) {
      mappingHostNames.push(dnsName.replace('*.', ''))
    }

    const serverPromiseObj = {
      cacheKey,
      port,
      ssl,
      mappingHostNames,
    }

    const promise = new Promise((resolve, reject) => {
      (async () => {
        let fakeServer
        let cert
        let key

        log.info(`【CreateFakeServer】hostname: ${hostname}:${port}, ssl: ${ssl}, protocol: ${ssl ? 'https' : 'http'}`)

        if (ssl) {
          const certObj = await this.certAndKeyContainer.getCertPromise(hostname, port, dnsName, mappingHostNames)
          cert = certObj.cert
          key = certObj.key
          const certPem = pki.certificateToPem(cert)
          const keyPem = pki.privateKeyToPem(key)
          const secureContext = tls.createSecureContext({ key: keyPem, cert: certPem })
          fakeServer = new https.Server({
            key: keyPem,
            cert: certPem,
            SNICallback: (hostname, done) => {
              log.info(`fakeServer SNICallback: ${hostname}:${port}`)
              done(null, secureContext)
            },
          })
        } else {
          fakeServer = new http.Server()
        }
        const serverObj = {
          cert,
          key,
          server: fakeServer,
          port: 0, // if port === 0 ,should listen server's `listening` event.
        }
        serverPromiseObj.serverObj = serverObj

        let isListening = false

        const printDebugLog = process.env.NODE_ENV === 'development' && false // 开发过程中，如有需要可以将此参数临时改为true，打印所有事件的日志
        fakeServer.listen(0, () => {
          const address = fakeServer.address()
          serverObj.port = address.port
        })
        fakeServer.on('request', (req, res) => {
          if (printDebugLog) {
            log.debug(`【fakeServer request - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          }
          this.requestHandler(req, res, ssl)
        })
        fakeServer.on('listening', () => {
          isListening = true
          if (printDebugLog) {
            log.debug(`【fakeServer listening - ${hostname}:${port}】no arguments...`)
          }
          resolve(serverObj)
        })
        fakeServer.on('upgrade', (req, socket, head) => {
          if (printDebugLog) {
            log.debug(`【fakeServer upgrade - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- socket -----\r\n', socket, '\r\n----- head -----\r\n', head)
          } else {
            log.info(`【fakeServer upgrade - ${hostname}:${port}】`, req.url)
          }
          this.upgradeHandler(req, socket, head, ssl)
        })

        // 三个 error 事件
        fakeServer.on('error', (e) => {
          log.error(`【fakeServer error - ${hostname}:${port}】\r\n----- error -----\r\n`, e)
          if (!isListening) {
            reject(e)
          }
        })
        fakeServer.on('clientError', (err, _socket) => {
          // log.error(`【fakeServer clientError - ${hostname}:${port}】\r\n----- error -----\r\n`, err, '\r\n----- socket -----\r\n', socket)
          log.error(`【fakeServer clientError - ${hostname}:${port}】\r\n`, err)

          // 自动兼容程序：1
          if (port !== 443 && port !== 80) {
            if (ssl === true && err.code && err.code.startsWith('ERR_SSL_')) {
              compatible.setConnectSsl(hostname, port, false)
              log.error(`自动兼容程序：SSL异常，现设置为禁用ssl: ${hostname}:${port}, ssl = false`)
            } else if (ssl === false && err.code === 'HPE_INVALID_METHOD') {
              compatible.setConnectSsl(hostname, port, true)
              log.error(`自动兼容程序：${err.code}，现设置为启用ssl: ${hostname}:${port}, ssl = true`)
            }
          }
        })
        if (ssl) {
          fakeServer.on('tlsClientError', (err, _tlsSocket) => {
            if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
              return // 在tlsClientError事件中，以上异常不记录日志
            }
            // log.error(`【fakeServer tlsClientError - ${hostname}:${port}】\r\n----- error -----\r\n`, err, '\r\n----- tlsSocket -----\r\n', tlsSocket)
            log.error(`【fakeServer tlsClientError - ${hostname}:${port}】\r\n`, err)
          })
        }

        // 其他监听事件，只打印debug日志
        if (printDebugLog) {
          if (ssl) {
            fakeServer.on('keylog', (line, tlsSocket) => {
              log.debug(`【fakeServer keylog - ${hostname}:${port}】\r\n----- line -----\r\n`, line, '\r\n----- tlsSocket -----\r\n', tlsSocket)
            })
            // fakeServer.on('newSession', (sessionId, sessionData, callback) => {
            //   log.debug(`【fakeServer newSession - ${hostname}:${port}】\r\n----- sessionId -----\r\n`, sessionId, '\r\n----- sessionData -----\r\n', sessionData, '\r\n----- callback -----\r\n', callback)
            // })
            // fakeServer.on('OCSPRequest', (certificate, issuer, callback) => {
            //   log.debug(`【fakeServer OCSPRequest - ${hostname}:${port}】\r\n----- certificate -----\r\n`, certificate, '\r\n----- issuer -----\r\n', issuer, '\r\n----- callback -----\r\n', callback)
            // })
            // fakeServer.on('resumeSession', (sessionId, callback) => {
            //   log.debug(`【fakeServer resumeSession - ${hostname}:${port}】\r\n----- sessionId -----\r\n`, sessionId, '\r\n----- callback -----\r\n', callback)
            // })
            fakeServer.on('secureConnection', (tlsSocket) => {
              log.debug(`【fakeServer secureConnection - ${hostname}:${port}】\r\n----- tlsSocket -----\r\n`, tlsSocket)
            })
          }
          fakeServer.on('close', () => {
            log.debug(`【fakeServer close - ${hostname}:${port}】no arguments...`)
          })
          fakeServer.on('connection', (socket) => {
            log.debug(`【fakeServer connection - ${hostname}:${port}】\r\n----- socket -----\r\n`, socket)
          })
          fakeServer.on('checkContinue', (req, res) => {
            log.debug(`【fakeServer checkContinue - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          })
          fakeServer.on('checkExpectation', (req, res) => {
            log.debug(`【fakeServer checkExpectation - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          })
          fakeServer.on('connect', (req, socket, head) => {
            log.debug(`【fakeServer resumeSession - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- socket -----\r\n', socket, '\r\n----- head -----\r\n', head)
          })
        }
      })().catch(reject)
    })

    serverPromiseObj.promise = promise
    this.addServerPromise(serverPromiseObj)

    return promise
  }
}
