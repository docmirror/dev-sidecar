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

    isEnabled () {
      return config.get().plugin.git.enabled
    },

    async save (newConfig) {

    },

    async setProxy (ip, port) {
      const cmds = [
        `git config --global http.proxy  http://${ip}:${port} `,
        `git config --global https.proxy http://${ip}:${port} `,
      ]

      if (config.get().plugin.git.setting.sslVerify === true) {
        cmds.push('git config --global http.sslVerify false ')
      }

      if (config.get().plugin.git.setting.noProxyUrls != null) {
        for (const url in config.get().plugin.git.setting.noProxyUrls) {
          cmds.push(`git config --global http."${url}".proxy "" `)
        }
      }

      const ret = await shell.exec(cmds, { type: 'cmd' })
      event.fire('status', { key: 'plugin.git.enabled', value: true })
      log.info('开启【Git】代理成功')

      return ret
    },

    // 当手动修改过 `~/.gitconfig` 时，`unset` 可能会执行失败，所以除了第一条命令外，其他命令都添加了try-catch，防止关闭Git代理失败
    async unsetProxy () {
      const ret = await shell.exec(['git config --global --unset http.proxy '], { type: 'cmd' })

      try {
        await shell.exec(['git config --global --unset https.proxy '], { type: 'cmd' })
      }
      catch (ignore) {
      }

      if (config.get().plugin.git.setting.sslVerify === true) {
        try {
          await shell.exec(['git config --global --unset http.sslVerify '], { type: 'cmd' })
        }
        catch (ignore) {
        }
      }

      if (config.get().plugin.git.setting.noProxyUrls != null) {
        for (const url in config.get().plugin.git.setting.noProxyUrls) {
          try {
            await shell.exec([`git config --global --unset http."${url}".proxy `], { type: 'cmd' })
          }
          catch (ignore) {
          }
        }
      }
      event.fire('status', { key: 'plugin.git.enabled', value: false })
      log.info('关闭【Git】代理成功')
      return ret
    },
  }
  return pluginApi
}

module.exports = {
  key: 'git',
  config: pluginConfig,
  status: {
    enabled: false,
  },
  plugin: Plugin,
}
