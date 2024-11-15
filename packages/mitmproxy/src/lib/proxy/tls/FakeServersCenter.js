const http = require('http')
const https = require('https')
const forge = require('node-forge')
const CertAndKeyContainer = require('./CertAndKeyContainer')
const tlsUtils = require('./tlsUtils')

const pki = forge.pki
// const colors = require('colors')
const tls = require('tls')
const log = require('../../../utils/util.log')
const compatible = require('../compatible/compatible')

function arraysHaveSameElements (arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false
  }
  const sortedArr1 = [...arr1].sort()
  const sortedArr2 = [...arr2].sort()
  return sortedArr1.every((value, index) => value === sortedArr2[index])
}

module.exports = class FakeServersCenter {
  constructor ({ maxLength = 256, requestHandler, upgradeHandler, caCert, caKey, getCertSocketTimeout }) {
    this.queue = []
    this.maxLength = maxLength
    this.requestHandler = requestHandler
    this.upgradeHandler = upgradeHandler
    this.certAndKeyContainer = new CertAndKeyContainer({
      getCertSocketTimeout,
      caCert,
      caKey
    })
  }

  addServerPromise (serverPromiseObj) {
    if (this.queue.length >= this.maxLength) {
      const delServerObj = this.queue.shift()
      try {
        log.info('超过最大服务数量，删除旧服务。delServerObj:', delServerObj)
        delServerObj.serverObj.server.close()
      } catch (e) {
        log.error('`delServerObj.serverObj.server.close()` error:', e)
      }
    }
    this.queue.push(serverPromiseObj)
    return serverPromiseObj
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

    for (let i = 0; i < this.queue.length; i++) {
      const serverPromiseObj = this.queue[i]
      if (serverPromiseObj.port === port && serverPromiseObj.ssl === ssl) {
        const mappingHostNames = serverPromiseObj.mappingHostNames
        for (let j = 0; j < mappingHostNames.length; j++) {
          const DNSName = mappingHostNames[j]
          if (tlsUtils.isMappingHostName(DNSName, hostname)) {
            this.reRankServer(i)
            log.info(`Load promise from cache, hostname: ${hostname}:${port}, ssl: ${ssl}, serverPromiseObj: {"ssl":${serverPromiseObj.ssl},"port":${serverPromiseObj.port},"mappingHostNames":${JSON.stringify(serverPromiseObj.mappingHostNames)}}`)
            return serverPromiseObj.promise
          }
        }
      }
    }

    const serverPromiseObj = {
      port,
      ssl,
      mappingHostNames: [hostname] // temporary hostname
    }

    const promise = new Promise((resolve, reject) => {
      (async () => {
        let fakeServer
        let cert
        let key
        if (ssl) {
          const certObj = await this.certAndKeyContainer.getCertPromise(hostname, port)
          cert = certObj.cert
          key = certObj.key
          const certPem = pki.certificateToPem(cert)
          const keyPem = pki.privateKeyToPem(key)
          fakeServer = new https.Server({
            key: keyPem,
            cert: certPem,
            SNICallback: (hostname, done) => {
              (async () => {
                const certObj = await this.certAndKeyContainer.getCertPromise(hostname, port)
                log.info(`fakeServer SNICallback: ${hostname}:${port}`)
                done(null, tls.createSecureContext({
                  key: pki.privateKeyToPem(certObj.key),
                  cert: pki.certificateToPem(certObj.cert)
                }))
              })()
            }
          })
        } else {
          fakeServer = new http.Server()
        }
        const serverObj = {
          cert,
          key,
          server: fakeServer,
          port: 0 // if port === 0 ,should listen server's `listening` event.
        }
        serverPromiseObj.serverObj = serverObj

        const printDebugLog = false && process.env.NODE_ENV === 'development' // 开发过程中，如有需要可以将此参数临时改为true，打印所有事件的日志
        fakeServer.listen(0, () => {
          const address = fakeServer.address()
          serverObj.port = address.port
        })
        fakeServer.on('request', (req, res) => {
          if (printDebugLog) log.debug(`【fakeServer request - ${hostname}:${port}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          this.requestHandler(req, res, ssl)
        })
        let once = true
        fakeServer.on('listening', () => {
          if (printDebugLog) log.debug(`【fakeServer listening - ${hostname}:${port}】no arguments...`)
          if (cert && once) {
            once = false
            let newMappingHostNames = tlsUtils.getMappingHostNamesFromCert(cert)
            newMappingHostNames = [...new Set(newMappingHostNames)]
            if (!arraysHaveSameElements(serverPromiseObj.mappingHostNames, newMappingHostNames)) {
              log.info(`【fakeServer listening - ${hostname}:${port}】Reset mappingHostNames: `, serverPromiseObj.mappingHostNames, '变更为', newMappingHostNames)
              serverPromiseObj.mappingHostNames = newMappingHostNames
            }
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
        })
        fakeServer.on('clientError', (err, socket) => {
          // log.error(`【fakeServer clientError - ${hostname}:${port}】\r\n----- error -----\r\n`, err, '\r\n----- socket -----\r\n', socket)
          log.error(`【fakeServer clientError - ${hostname}:${port}】\r\n`, err)

          // 自动兼容程序：1
          if (port !== 443 && port !== 80) {
            if (ssl === true && err.code.indexOf('ERR_SSL_') === 0) {
              compatible.setConnectSsl(hostname, port, false)
              log.error(`自动兼容程序：SSL异常，现设置为禁用ssl: ${hostname}:${port}, ssl = false`)
            } else if (ssl === false && err.code === 'HPE_INVALID_METHOD') {
              compatible.setConnectSsl(hostname, port, true)
              log.error(`自动兼容程序：${err.code}，现设置为启用ssl: ${hostname}:${port}, ssl = true`)
            }
          }
        })
        if (ssl) {
          fakeServer.on('tlsClientError', (err, tlsSocket) => {
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
      })()
    })

    serverPromiseObj.promise = promise

    return (this.addServerPromise(serverPromiseObj)).promise
  }

  reRankServer (index) {
    // index ==> queue foot
    this.queue.push((this.queue.splice(index, 1))[0])
  }
}
