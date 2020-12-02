const pluginConfig = require('./config')

const Plugin = function (context) {
  const { config, shell, event, log } = context
  const api = {
    async start () {
      // event.fire('status', { key: 'plugin.overwall.enabled', value: true })
    },

    async close () {
      // event.fire('status', { key: 'plugin.overwall.enabled', value: false })
    },

    async restart () {
      await api.close()
      await api.start()
    },

    async  overrideRunningConfig_bak (serverConfig) {
      const conf = config.get().plugin.overwall
      if (!conf || !conf.enabled || !conf.targets) {
        return
      }
      const server = conf.server
      let i = 0
      let main
      const backup = []
      for (const key in server) {
        if (i === 0) {
          main = key
        } else {
          backup.push(key)
        }
        i++
      }
      for (const key in conf.targets) {
        serverConfig.intercepts[key] = {
          '.*': {
            // eslint-disable-next-line no-template-curly-in-string
            proxy: main + '/${host}',
            backup
          }
        }
      }
    }

  }
  return api
}

module.exports = {
  key: 'overwall',
  config: pluginConfig,
  plugin: Plugin
}
