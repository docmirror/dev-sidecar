const tlsUtils = require('../tls/tlsUtils')
const http = require('http')
const https = require('https')
const config = require('../common/config')
const log = require('../../../utils/util.log')
const createRequestHandler = require('./createRequestHandler')
const createConnectHandler = require('./createConnectHandler')
const createFakeServerCenter = require('./createFakeServerCenter')
const createUpgradeHandler = require('./createUpgradeHandler')
const DnsUtil = require('../../dns/index')
const defaultDns = require('dns')
const speedTest = require('../../speed/index.js')
module.exports = {
  createProxy ({
    host = config.defaultHost,
    port = config.defaultPort,
    caCertPath,
    caKeyPath,
    sslConnectInterceptor,
    createIntercepts,
    getCertSocketTimeout = 1 * 1000,
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

    const upgradeHandler = createUpgradeHandler()

    const fakeServersCenter = createFakeServerCenter({
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
      log.info(`dev-sidecar启动端口: ${port}`)
      server.on('error', (e) => {
        log.error('server error', e)
      })
      server.on('request', (req, res) => {
        const ssl = false
        // log.info('request,', req.hostname)
        requestHandler(req, res, ssl)
      })
      // tunneling for https
      server.on('connect', (req, cltSocket, head) => {
        // log.info('connect,', req.url)
        connectHandler(req, cltSocket, head)
      })
      // TODO: handler WebSocket
      server.on('upgrade', function (req, socket, head) {
        const ssl = false
        upgradeHandler(req, socket, head, ssl)
      })
      server.on('clientError', (err, socket) => {
        log.error('client error', err)
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
      })

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
