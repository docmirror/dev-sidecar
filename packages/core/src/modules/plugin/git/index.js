const pluginConfig = require('./config')
const Plugin = function (context) {
  const { config, shell, event, log } = context
  const pluginApi = {
    async start () {
      const ip = '127.0.0.1'
      const port = config.get().server.port
      await pluginApi.setProxy(ip, port)
      return { ip, port }
    },

    async close () {
      return pluginApi.unsetProxy()
    },

    async restart () {
      await pluginApi.close()
      await pluginApi.start()
    },

    async save (newConfig) {

    },

    async setProxy (ip, port) {
      // 代理https
      const ret = await shell.exec([`git config --global https.proxy http://${ip}:${port} `], { type: 'cmd' })

      try {
        if (config.get().plugin.git.setting.proxyHttp === true) {
          // 代理http
          await shell.exec([`git config --global http.proxy http://${ip}:${port} `], { type: 'cmd', printErrorLog: false })
        } else {
          // 尝试取消代理http
          await shell.exec(['git config --global --unset http.proxy '], { type: 'cmd', printErrorLog: false })
        }
      } catch (ignore) {
      }

      // 恢复ssl验证
      if (config.get().plugin.git.setting.sslVerify === true) {
        try {
          await shell.exec(['git config --global http.sslVerify false '], { type: 'cmd', printErrorLog: false })
        } catch (ignore) {
        }
      }

      event.fire('status', { key: 'plugin.git.enabled', value: true })
      log.info('开启【Git】代理成功')

      return ret
    },

    async unsetProxy () {
      // 取消代理https
      const ret = await shell.exec(['git config --global --unset https.proxy '], { type: 'cmd' })

      // 尝试取消代理http
      try {
        await shell.exec(['git config --global --unset http.proxy '], { type: 'cmd', printErrorLog: false })
      } catch (ignore) {
      }

      // 恢复ssl验证
      if (config.get().plugin.git.setting.sslVerify === true) {
        try {
          await shell.exec(['git config --global   http.sslVerify true '], { type: 'cmd', printErrorLog: false })
        } catch (ignore) {
        }
      }

      event.fire('status', { key: 'plugin.git.enabled', value: false })
      log.info('关闭【Git】代理成功')
      return ret
    }
  }
  return pluginApi
}

module.exports = {
  key: 'git',
  config: pluginConfig,
  status: {
    enabled: false
  },
  plugin: Plugin
}
