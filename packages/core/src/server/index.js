const ProxyOptions = require('./options')
const mitmproxy = require('../lib/proxy')
const config = require('../config')
const event = require('../event')
let server
const serverApi = {
  async start (newConfig) {
    if (server != null) {
      server.close()
    }
    config.set(newConfig)
    const proxyOptions = ProxyOptions(config.get())
    server = mitmproxy.createProxy(proxyOptions, () => {
      event.fire('status', { key: 'server', value: true })
    })
    server.on('close', () => {
      event.fire('status', { key: 'server', value: false })
    })
    server.on('error', (e) => {
      event.fire('error', { key: 'server.start', error: e })
    })
    server.config = config.get()
    return server.config
  },
  async close () {
    return new Promise((resolve, reject) => {
      if (server) {
        server.close((err) => {
          if (err) {
            console.log('close error', err)
            reject(err)
          } else {
            resolve()
          }
        })
        server = null
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
