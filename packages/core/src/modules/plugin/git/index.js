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
      const cmds = [
        `git config --global http.proxy  http://${ip}:${port} `,
        `git config --global https.proxy http://${ip}:${port} `
      ]
      if (config.get().plugin.git.setting.sslVerify === true) {
        cmds.push('git config --global http.sslVerify false ')
      }

      const ret = await shell.exec(cmds, { type: 'cmd' })
      event.fire('status', { key: 'plugin.git.enabled', value: true })
      log.info('开启【Git】代理成功')

      return ret
    },

    async unsetProxy () {
      const cmds = [
        'git config --global --unset https.proxy ',
        'git config --global --unset http.proxy '
      ]
      if (config.get().plugin.git.setting.sslVerify === true) {
        cmds.push('git config --global   http.sslVerify true ')
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
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
