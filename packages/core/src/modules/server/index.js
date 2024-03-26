const config = require('../../config')
const event = require('../../event')
const status = require('../../status')
const lodash = require('lodash')
const fork = require('child_process').fork
const log = require('../../utils/util.log')
const fs = require('fs')
const path = require('path')
let JSON5 = require('json5')
if (JSON5.default) {
  JSON5 = JSON5.default
}

let server = null
function fireStatus (status) {
  event.fire('status', { key: 'server.enabled', value: status })
}
function sleep (time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}
const serverApi = {
  async startup () {
    if (config.get().server.startup) {
      return this.start(config.get().server)
    }
  },
  async shutdown () {
    if (status.server) {
      return this.close()
    }
  },
  async start ({ mitmproxyPath, plugins }) {
    const allConfig = config.get()
    const serverConfig = lodash.cloneDeep(allConfig.server)

    const intercepts = serverConfig.intercepts
    const dnsMapping = serverConfig.dns.mapping

    if (allConfig.plugin) {
      lodash.each(allConfig.plugin, (value) => {
        const plugin = value
        if (!plugin.enabled) {
          return
        }
        if (plugin.intercepts) {
          lodash.merge(intercepts, plugin.intercepts)
        }
        if (plugin.dns) {
          lodash.merge(dnsMapping, plugin.dns)
        }
      })
    }

    if (serverConfig.intercept.enabled === false) {
      // 如果设置为关闭拦截
      serverConfig.intercepts = {}
    }

    for (const key in plugins) {
      const plugin = plugins[key]
      if (plugin.overrideRunningConfig) {
        plugin.overrideRunningConfig(serverConfig)
      }
    }
    serverConfig.plugin = allConfig.plugin

    if (allConfig.proxy && allConfig.proxy.enabled) {
      serverConfig.proxy = allConfig.proxy
    }

    // fireStatus('ing') // 启动中
    const basePath = serverConfig.setting.userBasePath
    const runningConfigPath = path.join(basePath, '/running.json')
    fs.writeFileSync(runningConfigPath, JSON.stringify(serverConfig, null, '\t'))
    log.info('保存运行时配置文件成功:', runningConfigPath)
    const serverProcess = fork(mitmproxyPath, [runningConfigPath])
    server = {
      id: serverProcess.pid,
      process: serverProcess,
      close () {
        serverProcess.send({ type: 'action', event: { key: 'close' } })
      }
    }
    serverProcess.on('beforeExit', (code) => {
      log.warn('server process beforeExit, code:', code)
    })
    serverProcess.on('SIGPIPE', (code, signal) => {
      log.warn(`server process SIGPIPE, code: ${code}, signal:`, signal)
    })
    serverProcess.on('exit', (code, signal) => {
      log.warn(`server process exit, code: ${code}, signal:`, signal)
    })
    serverProcess.on('uncaughtException', (err, origin) => {
      log.error('server process uncaughtException:', err)
    })
    serverProcess.on('message', function (msg) {
      log.info('收到子进程消息', msg.type, msg.event.key, msg.message)
      if (msg.type === 'status') {
        fireStatus(msg.event)
      } else if (msg.type === 'error') {
        let code = ''
        if (msg.event.code) {
          code = msg.event.code
        }
        fireStatus(false) // 启动失败
        event.fire('error', { key: 'server', value: code, error: msg.event, message: msg.message })
      } else if (msg.type === 'speed') {
        event.fire('speed', msg.event)
      }
    })
    return { port: serverConfig.port }
  },
  async kill () {
    if (server) {
      server.process.kill('SIGINT')
      await sleep(1000)
    }
    fireStatus(false)
  },
  async close () {
    return await serverApi.kill()
  },
  async close1 () {
    return new Promise((resolve, reject) => {
      if (server) {
        // fireStatus('ing')// 关闭中
        server.close((err) => {
          if (err) {
            log.warn('close error:', err)
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              log.info('代理服务关闭成功')
              resolve()
              return
            }
            log.warn('代理服务关闭失败:', err)
            reject(err)
          } else {
            log.info('代理服务关闭成功')
            resolve()
          }
        })
      } else {
        log.info('server is null')
        resolve()
      }
    })
  },
  async restart ({ mitmproxyPath }) {
    await serverApi.kill()
    await serverApi.start({ mitmproxyPath })
  },
  getServer () {
    return server
  },
  getSpeedTestList () {
    if (server) {
      server.process.send({ type: 'speed', event: { key: 'getList' } })
    }
  },
  reSpeedTest () {
    if (server) {
      server.process.send({ type: 'speed', event: { key: 'reTest' } })
    }
  }
}
module.exports = serverApi
