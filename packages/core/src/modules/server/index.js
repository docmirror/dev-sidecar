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
      console.log(`代理服务已启动:127.0.0.1:${proxyOptions.port}`)
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
        server.close((err) => {
          if (err) {
            console.log('close error', err)
            reject(err)
          } else {
            console.log('代理服务关闭')
            resolve()
          }
        })
        // 3秒后强制关闭
        setTimeout(() => {
          console.log('强制关闭')
          shell.killByPort(config.get().server.port)
          server = null
          event.fire('status', { key: 'server.enabled', value: false })
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
