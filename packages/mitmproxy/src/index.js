const mitmproxy = require('./lib/proxy')
const ProxyOptions = require('./options')
const proxyConfig = require('./lib/proxy/common/config')
const log = require('./utils/util.log')
const { fireError, fireStatus } = require('./utils/util.process')
const speedTest = require('./lib/speed/index.js')
let server

function registerProcessListener () {
  process.on('message', function (msg) {
    log.info('child get msg: ' + JSON.stringify(msg))
    if (msg.type === 'action') {
      api[msg.event.key](msg.event.params)
    } else if (msg.type === 'speed') {
      speedTest.action(msg.event)
    }
  })

  process.on('SIGINT', () => {
    log.info('on sigint : closed ')
    process.exit(0)
  })

  // 避免异常崩溃
  process.on('uncaughtException', function (err) {
    if (err.code === 'ECONNABORTED') {
      //  log.error(err.errno)
      return
    }
    log.error('uncaughtException:', err)
  })

  process.on('unhandledRejection', (err, p) => {
    log.info('Unhandled Rejection at: Promise', p, 'err:', err)
    // application specific logging, throwing an error, or other logic here
  })
  process.on('uncaughtExceptionMonitor', (err, origin) => {
    log.info('uncaughtExceptionMonitor:', err, origin)
  })
  process.on('exit', function (code, signal) {
    log.info('代理服务进程被关闭:', code, signal)
  })
  process.on('beforeExit', (code, signal) => {
    console.log('Process beforeExit event with code: ', code, signal)
  })
  process.on('SIGPIPE', (code, signal) => {
    log.warn('sub Process SIGPIPE', code, signal)
  })
}

const api = {
  async start (config) {
    const proxyOptions = ProxyOptions(config)
    const setting = config.setting
    if (setting) {
      if (setting.userBasePath) {
        proxyConfig.setDefaultCABasePath(setting.userBasePath)
      }
    }

    if (proxyOptions.setting && proxyOptions.setting.NODE_TLS_REJECT_UNAUTHORIZED === false) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
    }
    const newServer = mitmproxy.createProxy(proxyOptions, () => {
      fireStatus(true)
      log.info(`代理服务已启动：${proxyOptions.host}:${proxyOptions.port}`)
    })
    newServer.on('close', () => {
      log.info('server will closed ')
      if (server === newServer) {
        server = null
        fireStatus(false)
      }
    })
    newServer.on('error', (e) => {
      log.info('server error', e)
      // newServer = null
      fireError(e)
    })
    server = newServer

    registerProcessListener()
  },
  async close () {
    return new Promise((resolve, reject) => {
      if (server) {
        server.close((err) => {
          if (err) {
            log.info('close error', err, ',', err.code, ',', err.message, ',', err.errno)
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              log.info('代理服务关闭成功')
              resolve()
              return
            }
            reject(err)
          } else {
            log.info('代理服务关闭成功')
            resolve()
          }
        })
      } else {
        log.info('server is null')
        fireStatus(false)
        resolve()
      }
    })
  }
}

module.exports = {
  ...api,
  config: proxyConfig,
  log,
  speedTest
}
