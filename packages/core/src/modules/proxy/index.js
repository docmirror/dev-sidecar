const ProxyPlugin = function (context) {
  const { config, event, shell, log } = context
  const api = {
    async start () {
      return api.setProxy()
    },

    async close () {
      return api.unsetProxy()
    },

    async restart () {
      await api.close()
      await api.start()
    },

    async setProxy () {
      const ip = '127.0.0.1'
      const port = config.get().server.port
      const setEnv = config.get().proxy.setEnv
      await shell.setSystemProxy({ ip, port, setEnv })
      log.info(`开启系统代理成功：${ip}:${port}`)
      event.fire('status', { key: 'proxy.enabled', value: true })
      return { ip, port }
    },

    async unsetProxy (setEnv) {
      if (setEnv) {
        setEnv = config.get().proxy.setEnv
      }
      try {
        await shell.setSystemProxy({ setEnv })
        event.fire('status', { key: 'proxy.enabled', value: false })
        log.info('关闭系统代理成功')
        return true
      } catch (err) {
        log.error('关闭系统代理失败', err)
        return false
      }
    },

    async setEnableLoopback () {
      await shell.enableLoopback()
      log.info('打开EnableLoopback成功')
      return true
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
    other: [],
    setEnv: false
  },
  status: {
    enabled: false,
    proxyTarget: ''
  },
  plugin: ProxyPlugin
}
