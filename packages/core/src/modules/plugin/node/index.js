const jsonApi = require('@docmirror/mitmproxy/src/json')
const nodeConfig = require('./config')

const NodePlugin = function (context) {
  const { config, shell, event, log } = context
  const nodeApi = {
    async start () {
      try {
        await nodeApi.setVariables()
      }
      catch (err) {
        log.warn('set variables error:', err)
      }

      const ip = '127.0.0.1'
      const port = config.get().server.port
      await nodeApi.setProxy(ip, port)
      return { ip, port }
    },

    async close () {
      return nodeApi.unsetProxy()
    },

    async restart () {
      await nodeApi.close()
      await nodeApi.start()
    },

    async save (newConfig) {
      nodeApi.setVariables()
    },
    async getNpmEnv () {
      const command = config.get().plugin.node.setting.command || 'npm'

      const ret = await shell.exec([`${command} config list --json`], { type: 'cmd' })
      if (ret != null) {
        const json = ret.substring(ret.indexOf('{'))
        return jsonApi.parse(json)
      }
      return {}
    },

    async setNpmEnv (list) {
      const command = config.get().plugin.node.setting.command || 'npm'

      const cmds = []
      for (const item of list) {
        if (item.value != null && item.value.length > 0 && item.value !== 'default' && item.value !== 'null') {
          cmds.push(`${command} config set ${item.key}  ${item.value}`)
        }
        else {
          cmds.push(`${command} config delete ${item.key}`)
        }
      }
      return await shell.exec(cmds, { type: 'cmd' })
    },

    async unsetNpmEnv (list) {
      const command = config.get().plugin.node.setting.command || 'npm'

      const cmds = []
      for (const item of list) {
        cmds.push(`${command} config delete ${item} `)
      }
      return await shell.exec(cmds, { type: 'cmd' })
    },

    async setYarnEnv (list) {
      const cmds = []
      log.debug('yarn set:', JSON.stringify(list))
      for (const item of list) {
        if (item.value != null && item.value.length > 0 && item.value !== 'default' && item.value !== 'null') {
          cmds.push(`yarn config set ${item.key}  ${item.value}`)
        }
        else {
          cmds.push(`yarn config delete ${item.key}`)
        }
      }
      return await shell.exec(cmds, { type: 'cmd' })
    },

    async unsetYarnEnv (list) {
      const cmds = []
      for (const item of list) {
        cmds.push(`yarn config delete ${item} `)
      }
      return await shell.exec(cmds, { type: 'cmd' })
    },

    async getVariables () {
      const currentMap = await nodeApi.getNpmEnv()
      const list = []
      const map = config.get().plugin.node.variables
      for (const key in map) {
        const exists = currentMap[key] != null
        list.push({
          key,
          value: map[key],
          oldValue: currentMap[key],
          exists,
          hadSet: currentMap[key] === map[key],
        })
      }
      return list
    },

    async setVariables () {
      const list = await nodeApi.getVariables()
      const noSetList = list.filter((item) => {
        return !item.exists
      })
      if (noSetList.length > 0) {
        return nodeApi.setNpmEnv(noSetList)
      }
    },

    async setRegistry ({ registry, type }) {
      if (type === 'npm') {
        await nodeApi.setNpmEnv([{ key: 'registry', value: registry }])
      }
      else {
        await nodeApi.setYarnEnv([{ key: 'registry', value: registry }])
      }
      return true
    },

    async setProxy (ip, port) {
      const command = config.get().plugin.node.setting.command || 'npm'

      const cmds = [
        `${command} config set proxy=http://${ip}:${port}`,
        `${command} config set https-proxy=http://${ip}:${port}`,
      ]

      const env = []

      /**
       *  'strict-ssl': false,
       cafile: true,
       NODE_EXTRA_CA_CERTS: true,
       NODE_TLS_REJECT_UNAUTHORIZED: false
       */
      const nodeConfig = config.get().plugin.node
      const rootCaCertFile = config.get().server.setting.rootCaFile.certPath
      if (nodeConfig.setting['strict-ssl']) {
        cmds.push(`${command} config set strict-ssl false`)
      }
      if (nodeConfig.setting.cafile) {
        cmds.push(`${command} config set cafile "${rootCaCertFile}"`)
      }

      if (nodeConfig.setting.NODE_EXTRA_CA_CERTS) {
        cmds.push(`${command} config set NODE_EXTRA_CA_CERTS "${rootCaCertFile}"`)
        env.push({ key: 'NODE_EXTRA_CA_CERTS', value: rootCaCertFile })
      }

      if (nodeConfig.setting.NODE_TLS_REJECT_UNAUTHORIZED) {
        cmds.push(`${command} config set NODE_TLS_REJECT_UNAUTHORIZED 0`)
        env.push({ key: 'NODE_TLS_REJECT_UNAUTHORIZED', value: '0' })
      }

      const ret = await shell.exec(cmds, { type: 'cmd' })
      if (env.length > 0) {
        await shell.setSystemEnv({ list: env })
      }
      event.fire('status', { key: 'plugin.node.enabled', value: true })
      log.info('开启【NPM】代理成功')

      return ret
    },

    async unsetProxy () {
      const command = config.get().plugin.node.setting.command || 'npm'

      const cmds = [
        `${command} config  delete proxy`,
        `${command} config  delete https-proxy`,
        `${command} config  delete NODE_EXTRA_CA_CERTS`,
        `${command} config  delete strict-ssl`,
      ]
      const ret = await shell.exec(cmds, { type: 'cmd' })
      event.fire('status', { key: 'plugin.node.enabled', value: false })
      log.info('关闭【NPM】代理成功')
      return ret
    },
  }
  return nodeApi
}

module.exports = {
  key: 'node',
  config: nodeConfig,
  status: {
    enabled: false,
  },
  plugin: NodePlugin,
}
