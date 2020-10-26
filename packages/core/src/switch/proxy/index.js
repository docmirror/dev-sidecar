const systemProxy = require('./impl/system-proxy')
const npmProxy = require('./impl/npm-proxy')
const yarnProxy = require('./impl/yarn-proxy')
const event = require('../../event')
const config = require('../../config')
function createProxyApi (type, impl) {
  return {
    async open (conf = { ip: '127.0.0.1', port: config.get().server.port }) {
      try {
        const { ip, port } = conf
        await impl.setProxy(ip, port)
        event.fire('status', { key: 'proxy.' + type, value: true })
        console.info(`开启【${type}】代理成功`)
      } catch (e) {
        console.error(`开启【${type}】代理失败`, e)
      }
    },
    async close () {
      try {
        await impl.unsetProxy()
        event.fire('status', { key: 'proxy.' + type, value: false })
        console.info(`关闭【${type}】代理成功`)
      } catch (e) {
        console.error(`关闭【${type}】代理失败`, e)
      }
    }
  }
}

module.exports = {
  system: createProxyApi('system', systemProxy),
  npm: createProxyApi('npm', npmProxy),
  yarn: createProxyApi('yarn', yarnProxy)
}
