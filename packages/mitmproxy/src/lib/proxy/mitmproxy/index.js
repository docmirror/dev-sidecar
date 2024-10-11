const tlsUtils = require('../tls/tlsUtils')
const http = require('http')
const config = require('../common/config')
const log = require('../../../utils/util.log')
const createRequestHandler = require('./createRequestHandler')
const createConnectHandler = require('./createConnectHandler')
const createFakeServerCenter = require('./createFakeServerCenter')
const createUpgradeHandler = require('./createUpgradeHandler')
const speedTest = require('../../speed/index.js')
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
    sniConfig
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
    const dnsMap = dnsConfig.providers
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
      setting
    )

    const upgradeHandler = createUpgradeHandler(setting)

    const fakeServersCenter = createFakeServerCenter({
      maxLength,
      caCertPath,
      caKeyPath,
      requestHandler,
      upgradeHandler,
      getCertSocketTimeout
    })

    const connectHandler = createConnectHandler(
      sslConnectInterceptor,
      middlewares,
      fakeServersCenter,
      dnsConfig,
      sniConfig
    )

    const server = new http.Server()
    server.listen(port, host, () => {
      log.info(`dev-sidecar启动端口: ${host}:${port}`)
      server.on('request', (req, res) => {
        const ssl = false
        log.debug('【server request】\r\n----- req -----\r\n', req, '\r\n----- res -----\r\n', res)
        requestHandler(req, res, ssl)
      })
      // tunneling for https
      server.on('connect', (req, cltSocket, head) => {
        log.debug('【server connect】\r\n----- req -----\r\n', req, '\r\n----- cltSocket -----\r\n', cltSocket, '\r\n----- head -----\r\n', head)
        connectHandler(req, cltSocket, head)
      })
      // TODO: handler WebSocket
      server.on('upgrade', function (req, cltSocket, head) {
        const ssl = false
        log.debug('【server upgrade】\r\n----- req -----\r\n', req)
        upgradeHandler(req, cltSocket, head, ssl)
      })
      server.on('error', (err) => {
        log.error('【server error】\r\n----- error -----\r\n', err)
      })
      server.on('clientError', (err, cltSocket) => {
        // log.error('【server clientError】\r\n----- error -----\r\n', err, '\r\n----- cltSocket -----\r\n', cltSocket)
        log.error('【server clientError】\r\n', err)
        cltSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
      })

      // 其他事件：仅记录debug日志
      if (process.env.NODE_ENV === 'development') {
        server.on('close', () => {
          log.debug('【server close】no arguments...')
        })
        server.on('connection', (cltSocket) => {
          log.debug('【server connection】\r\n----- cltSocket -----\r\n', cltSocket)
        })
        server.on('listening', () => {
          log.debug('【server listening】no arguments...')
        })
        server.on('checkContinue', (req, res) => {
          log.debug('【server checkContinue】\r\n----- req -----\r\n', req, '\r\n----- res -----\r\n', res)
        })
        server.on('checkExpectation', (req, res) => {
          log.debug('【server checkExpectation】\r\n----- req -----\r\n', req, '\r\n----- res -----\r\n', res)
        })
        server.on('dropRequest', (req, cltSocket) => {
          log.debug('【server checkExpectation】\r\n----- req -----\r\n', req, '\r\n----- cltSocket -----\r\n', cltSocket)
        })
      }

      if (callback) {
        callback(server)
      }
    })

    return server
  },
  createCA (caPaths) {
    return tlsUtils.initCA(caPaths)
  }
}
