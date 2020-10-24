const ProxyOptions = require('./options')
const mitmproxy = require('../lib/proxy')
const getLogger = require('../lib/utils/logger')
const logger = getLogger('proxy')
const config = require('../config')
const event = require('../event')
let server
module.exports = {
  async start (newConfig) {
    config.set(newConfig)
    const proxyOptions = ProxyOptions(config.get())
    server = mitmproxy.createProxy(proxyOptions, () => {
      event.fire('status', { key: 'server', value: true })
      server.on('close', () => {
        event.fire('status', { key: 'server', value: false })
      })
    })
    server.config = config.get()
    return server.config
  },
  close () {
    try {
      if (server) {
        server.close()
      }
    } catch (err) {
      logger.error(err)
    }
  },
  getServer () {
    return server
  }
}
