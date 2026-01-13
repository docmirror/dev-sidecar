import proxyLib from './lib/proxy'
import proxyConfig, { setDefaultCABasePath } from './lib/proxy/common/config.js'
import speedTest from './lib/speed'
import ProxyOptions from './options.js'
import log from './utils/util.log.server.js'
import utilProcess from './utils/util.process.js'

const { createProxy } = proxyLib
const { action } = speedTest
const { fireError, fireStatus } = utilProcess
const { info, error, warn } = log
// const mitmproxy = require('./lib/proxy')
// const proxyConfig = require('./lib/proxy/common/config')
// const speedTest = require('./lib/speed')
// const ProxyOptions = require('./options')
// const log = require('./utils/util.log.server')
// const { fireError, fireStatus } = require('./utils/util.process')

let servers = []

const api = {
  async start (config) {
    const proxyOptions = ProxyOptions(config)
    const setting = config.setting
    if (setting) {
      if (setting.userBasePath) {
        setDefaultCABasePath(setting.userBasePath)
      }
    }

    if (proxyOptions.setting && proxyOptions.setting.NODE_TLS_REJECT_UNAUTHORIZED === false) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'
    }
    // log.info('启动代理服务时的配置:', JSON.stringify(proxyOptions, null, '\t'))
    const newServers = createProxy(proxyOptions, (server, port, host, ssl) => {
      fireStatus(true)
      log.info(`代理服务已启动：${host}:${port}, ssl: ${ssl}`)
    })
    for (const newServer of newServers) {
      newServer.on('close', () => {
        log.info('server will closed ')
        if (servers.includes(newServer)) {
          servers = servers.filter(item => item !== newServer)
          if (servers.length === 0) {
            fireStatus(false)
          }
        }
      })
      newServer.on('error', (e) => {
        log.error('server error', e)
        // newServer = null
        fireError(e)
      })
    }
    servers = newServers

    registerProcessListener()
  },
  async close () {
    return new Promise((resolve, reject) => {
      if (servers && servers.length > 0) {
        for (const server of servers) {
          server.close((err) => {
            if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
              if (err.code === 'ERR_SERVER_NOT_RUNNING') {
                info('代理服务未运行，无需关闭')
                resolve()
              } else {
                error('代理服务关闭失败:', err)
                reject(err)
              }
              return
            }

            info('代理服务关闭成功')
            resolve()
          })
        }
        servers = []
      } else {
        info('server is null, no need to close.')
        fireStatus(false)
        resolve()
      }
    })
  },
}

function registerProcessListener () {
  process.on('message', (msg) => {
    info('child get msg:', JSON.stringify(msg))
    if (msg.type === 'action') {
      api[msg.event.key](msg.event.params)
    } else if (msg.type === 'speed') {
      action(msg.event)
    }
  })

  process.on('SIGINT', () => {
    info('on sigint : closed ')
    process.exit(0)
  })

  // 避免异常崩溃
  process.on('uncaughtException', (err) => {
    if (err.code === 'ECONNABORTED') {
      //  log.error(err.errno)
      return
    }
    error('Process uncaughtException:', err)
  })

  process.on('unhandledRejection', (err, p) => {
    info('Process unhandledRejection at: Promise', p, 'err:', err)
    // application specific logging, throwing an error, or other logic here
  })
  process.on('uncaughtExceptionMonitor', (err, origin) => {
    info('Process uncaughtExceptionMonitor:', err, origin)
  })
  process.on('exit', (code, signal) => {
    info('代理服务进程被关闭:', code, signal)
  })
  // Aviod keeping print log before exit
  // process.on('beforeExit', (code, signal) => {
  //   log.info('Process beforeExit event with code: ', code, signal)
  // })
  process.on('SIGPIPE', (code, signal) => {
    warn('sub Process SIGPIPE', code, signal)
  })
}

export default {
  ...api,
  config: proxyConfig,
  log,
  speedTest,
}
