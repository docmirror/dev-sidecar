const config = require('../../config')
const event = require('../../event')
const status = require('../../status')
const lodash = require('lodash')
const fork = require('child_process').fork
let server
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
  async start ({ mitmproxyPath }) {
    const allConfig = config.get()
    const serverConfig = lodash.cloneDeep(allConfig.server)

    const intercepts = serverConfig.intercepts
    const dnsMapping = serverConfig.dns.mapping

    if (allConfig.plugin) {
      lodash.each(allConfig.plugin, (value) => {
        const plugin = value
        if (plugin.intercepts) {
          lodash.merge(intercepts, plugin.intercepts)
        }
        if (plugin.dns) {
          lodash.merge(dnsMapping, plugin.dns)
        }
      })
    }
    // fireStatus('ing') // 启动中
    const serverProcess = fork(mitmproxyPath, [JSON.stringify(serverConfig)])
    server = {
      id: serverProcess.pid,
      process: serverProcess,
      close () {
        serverProcess.send({ type: 'action', event: { key: 'close' } })
      }
    }
    serverProcess.on('message', function (msg) {
      console.log('收到子进程消息', msg)
      if (msg.type === 'status') {
        fireStatus(msg.event)
      } else if (msg.type === 'error') {
        event.fire('error', { key: 'server', error: msg.event })
      }
    })
    return { port: config.port }
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
            console.log('close error', err, ',', err.code, ',', err.message, ',', err.errno)
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              console.log('代理服务关闭成功')
              resolve()
              return
            }
            console.log('代理服务关闭失败', err)
            reject(err)
          } else {
            console.log('代理服务关闭成功')
            resolve()
          }
        })
      } else {
        console.log('server is null')
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
  }
}
module.exports = serverApi
