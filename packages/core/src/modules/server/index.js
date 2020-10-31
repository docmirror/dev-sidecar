const ProxyOptions = require('./options')
const mitmproxy = require('../../lib/proxy')
const config = require('../../config')
const event = require('../../event')
const status = require('../../status')
const shell = require('../../shell')
let server
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
  async start (newConfig) {
    if (server != null) {
      server.close()
    }
    config.set(newConfig)
    const proxyOptions = ProxyOptions(config.get())
    const newServer = mitmproxy.createProxy(proxyOptions, () => {
      event.fire('status', { key: 'server.enabled', value: true })
      console.log('代理服务已启动：127.0.0.1:' + proxyOptions.port)
    })
    newServer.on('close', () => {
      if (server === newServer) {
        server = null
        event.fire('status', { key: 'server.enabled', value: false })
      }
    })
    newServer.on('error', (e) => {
      console.log('server error', e)
      // newServer = null
      event.fire('error', { key: 'server', error: e })
    })
    newServer.config = proxyOptions
    server = newServer
    return { port: proxyOptions.port }
  },
  async close () {
    return new Promise((resolve, reject) => {
      if (server) {
        const currentServer = server
        let closed = false
        server.close((err) => {
          if (err) {
            console.log('close error', err, ',', err.code, ',', err.message, ',', err.errno)
            if (err.code === 'ERR_SERVER_NOT_RUNNING') {
              console.log('代理服务关闭成功')
              closed = true
              resolve()
              return
            }
            reject(err)
          } else {
            console.log('代理服务关闭成功')
            closed = true
            resolve()
          }
        })
        // 3秒后强制关闭
        setTimeout(async () => {
          if (closed) {
            return
          }
          console.log('强制关闭:', config.get().server.port)
          await shell.killByPort({ port: config.get().server.port })
          if (currentServer === server) {
            server = null
            event.fire('status', { key: 'server.enabled', value: false })
          }
          closed = true
          resolve()
        }, 3000)
      } else {
        console.log('server is null')
        resolve()
      }
    })
  },
  async restart () {
    try {
      await serverApi.close()
    } catch (err) {
      console.log('stop error', err)
    }
    await serverApi.start()
  },
  getServer () {
    return server
  }
}
module.exports = serverApi
