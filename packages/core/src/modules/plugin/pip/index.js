const pipConfig = require('./config')
const PipPlugin = function (context) {
  const { config, shell, event, log } = context
  const api = {
    async start () {
      await api.setRegistry({ registry: config.get().plugin.pip.setting.registry })
      await api.setTrustedHost(config.get().plugin.pip.setting.trustedHost)
    },

    async close () {
    },

    async restart () {
      await api.close()
      await api.start()
    },

    async save (newConfig) {
      await api.setVariables()
    },
    async getPipEnv () {
      const command = config.get().plugin.pip.setting.command
      let ret = await shell.exec([command + ' config list'], { type: 'cmd' })
      if (ret != null) {
        ret = ret.trim()
        const lines = ret.split('\n')
        const vars = {}
        for (const line of lines) {
          if (!line.startsWith('global')) {
            continue
          }
          const key = line.substring(0, line.indexOf('='))
          let value = line.substring(line.indexOf('=') + 1)
          if (value.startsWith('\'')) {
            value = value.startsWith(1, value.length - 1)
          }
          vars[key] = value
        }
        return vars
      }
      return {}
    },

    async setPipEnv (list) {
      const command = config.get().plugin.pip.setting.command
      const cmds = []
      for (const item of list) {
        if (item.value != null) {
          cmds.push(`${command} config set global.${item.key}  ${item.value}`)
        } else {
          cmds.push(`${command} config unset  global.${item.key}`)
        }
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
    },

    async unsetPipEnv (list) {
      const command = config.get().plugin.pip.setting.command
      const cmds = []
      for (const item of list) {
        cmds.push(`${command} config unset  global.${item} `)
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
    },

    async setRegistry ({ registry }) {
      await api.setPipEnv([{ key: 'index-url', value: registry }])
      return true
    },

    async setTrustedHost (host) {
      await api.setPipEnv([{ key: 'trusted-host', value: host }])
      return true
    },

    async setProxy (ip, port) {

    },

    async unsetProxy () {

    }
  }
  return api
}

module.exports = {
  key: 'pip',
  config: pipConfig,
  status: {
    enabled: false
  },
  plugin: PipPlugin
}
