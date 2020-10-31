const systemProxy = require('./system-proxy')
const ProxyPlugin = function (context) {
  const { config, event } = context
  const api = {
    async start () {
      return api.setProxy()
    },

    async close () {
      return api.unsetProxy()
    },

    async setProxy () {
      const ip = '127.0.0.1'
      const port = config.get().server.port
      await systemProxy.setProxy(ip, port)
      console.log(`开启系统代理成功：${ip}:${port}`)
      event.fire('status', { key: 'proxy.enabled', value: true })
      return { ip, port }
    },

    async unsetProxy () {
      try {
        systemProxy.unsetProxy()
        event.fire('status', { key: 'proxy.enabled', vlaue: false })
        console.log('关闭系统代理成功')
        return true
      } catch (err) {
        console.error('关闭系统代理失败', err)
        return false
      }
    }
  }
  return api
}
module.exports = {
  key: 'proxy',
  config: {
    enabled: true,
    name: '系统代理',
    use: 'local',
    other: {
      host: undefined,
      port: undefined,
      username: undefined,
      password: undefined
    }
  },
  status: {
    enabled: false,
    proxyTarget: ''
  },
  plugin: ProxyPlugin
}
