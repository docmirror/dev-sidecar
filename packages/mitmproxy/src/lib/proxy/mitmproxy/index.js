const http = require('node:http')
const log = require('../../../utils/util.log')
const speedTest = require('../../speed/index.js')
const config = require('../common/config')
const tlsUtils = require('../tls/tlsUtils')
const createConnectHandler = require('./createConnectHandler')
const createFakeServerCenter = require('./createFakeServerCenter')
const createRequestHandler = require('./createRequestHandler')
const createUpgradeHandler = require('./createUpgradeHandler')

module.exports = {
  createProxy ({
    host = config.defaultHost,
    port = config.defaultPort,
    maxLength = config.defaultMaxLength,
    caCertPath,
    caKeyPath,
    sslConnectInterceptor,
    createIntercepts,
    getCertSocketTimeout = 1000,
    middlewares = [],
    externalProxy,
    dnsConfig,
    setting,
    compatibleConfig,
  }, callback) {
    // Don't reject unauthorized
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    log.info(`CA Cert read in: ${caCertPath}`)
    log.info(`CA private key read in: ${caKeyPath}`)
    if (!caCertPath) {
      caCertPath = config.getDefaultCACertPath()
    }
    if (!caKeyPath) {
      caKeyPath = config.getDefaultCAKeyPath()
    }
    const rs = this.createCA({ caCertPath, caKeyPath })
    if (rs.create) {
      log.info(`CA Cert saved in: ${caCertPath}`)
      log.info(`CA private key saved in: ${caKeyPath}`)
    }

    port = ~~port
    const speedTestConfig = dnsConfig.speedTest
    const dnsMap = dnsConfig.dnsMap
    if (speedTestConfig) {
      const dnsProviders = speedTestConfig.dnsProviders
      const map = {}
      for (const dnsProvider of dnsProviders) {
        if (dnsMap[dnsProvider]) {
          map[dnsProvider] = dnsMap[dnsProvider]
        }
      }
      speedTest.initSpeedTest({ ...speedTestConfig, dnsMap: map })
    }

    const requestHandler = createRequestHandler(
      createIntercepts,
      middlewares,
      externalProxy,
      dnsConfig,
      setting,
      compatibleConfig,
    )

    const upgradeHandler = createUpgradeHandler(setting)

    const fakeServersCenter = createFakeServerCenter({
      maxLength,
      caCertPath,
      caKeyPath,
      requestHandler,
      upgradeHandler,
      getCertSocketTimeout,
    })

    const connectHandler = createConnectHandler(
      sslConnectInterceptor,
      middlewares,
      fakeServersCenter,
      dnsConfig,
      compatibleConfig,
    )

    // 创建监听方法，用于监听 http 和 https 两个端口
    const printDebugLog = false && process.env.NODE_ENV === 'development' // 开发过程中，如有需要可以将此参数临时改为true，打印所有事件的日志
    const serverListen = (server, ssl, port, host) => {
      server.listen(port, host, () => {
        log.info(`dev-sidecar启动 ${ssl ? 'https' : 'http'} 端口: ${host}:${port}`)
        server.on('request', (req, res) => {
          if (printDebugLog) {
            log.debug(`【server request, ssl: ${ssl}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          }
          requestHandler(req, res, ssl)
        })
        // tunneling for https
        server.on('connect', (req, cltSocket, head) => {
          if (printDebugLog) {
            log.debug(`【server connect, ssl: ${ssl}】\r\n----- req -----\r\n`, req, '\r\n----- cltSocket -----\r\n', cltSocket, '\r\n----- head -----\r\n', head)
          }
          connectHandler(req, cltSocket, head, ssl)
        })
        // TODO: handler WebSocket
        server.on('upgrade', (req, cltSocket, head) => {
          if (printDebugLog) {
            log.debug(`【server upgrade, ssl: ${ssl}】\r\n----- req -----\r\n`, req)
          }
          else {
            log.info(`【server upgrade, ssl: ${ssl}】`, req.url)
          }
          upgradeHandler(req, cltSocket, head, ssl)
        })
        server.on('error', (err) => {
          log.error(`【server error, ssl: ${ssl}】\r\n----- error -----\r\n`, err)
        })
        server.on('clientError', (err, cltSocket) => {
          // log.error(`【server clientError, ssl: ${ssl}】\r\n----- error -----\r\n`, err, '\r\n----- cltSocket -----\r\n', cltSocket)
          log.error(`【server clientError, ssl: ${ssl}】socket.localPort = ${cltSocket.localPort}\r\n`, err)
          cltSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
        })

        // 其他事件：仅记录debug日志
        if (printDebugLog) {
          server.on('close', () => {
            log.debug(`【server close, ssl: ${ssl}】no arguments...`)
          })
          server.on('connection', (cltSocket) => {
            log.debug(`【server connection, ssl: ${ssl}】\r\n----- cltSocket -----\r\n`, cltSocket)
          })
          server.on('listening', () => {
            log.debug(`【server listening, ssl: ${ssl}】no arguments...`)
          })
          server.on('checkContinue', (req, res) => {
            log.debug(`【server checkContinue, ssl: ${ssl}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          })
          server.on('checkExpectation', (req, res) => {
            log.debug(`【server checkExpectation, ssl: ${ssl}】\r\n----- req -----\r\n`, req, '\r\n----- res -----\r\n', res)
          })
          server.on('dropRequest', (req, cltSocket) => {
            log.debug(`【server checkExpectation, ssl: ${ssl}】\r\n----- req -----\r\n`, req, '\r\n----- cltSocket -----\r\n', cltSocket)
          })
        }

        if (callback) {
          callback(server, port, host, ssl)
        }
      })
    }

    const httpsServer = new http.Server()
    const httpServer = new http.Server()

    // `http端口` 比 `https端口` 要小1
    const httpsPort = port
    const httpPort = port - 1
    serverListen(httpsServer, true, httpsPort, host)
    serverListen(httpServer, false, httpPort, host)

    return [httpsServer, httpServer]
  },
  createCA (caPaths) {
    return tlsUtils.initCA(caPaths)
  },
}
