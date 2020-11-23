const ProxyPlugin = function (context) {
  const { config, event, shell, log } = context
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
      await shell.setSystemProxy({ ip, port })
      log.info(`开启系统代理成功：${ip}:${port}`)
      event.fire('status', { key: 'proxy.enabled', value: true })
      return { ip, port }
    },

    async unsetProxy () {
      try {
        await shell.setSystemProxy()
        event.fire('status', { key: 'proxy.enabled', value: false })
        log.info('关闭系统代理成功')
        return true
      } catch (err) {
        log.error('关闭系统代理失败', err)
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
    other: []
  },
  status: {
    enabled: false,
    proxyTarget: ''
  },
  plugin: ProxyPlugin
}
