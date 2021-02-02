const nodeConfig = require('./config')
const NodePlugin = function (context) {
  const { config, shell, event, log } = context
  const nodeApi = {
    async start () {
      try {
        await nodeApi.setVariables()
      } catch (err) {
        log.warn('set variables error', err)
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
      const ret = await shell.exec(['npm config list --json'], { type: 'cmd' })
      if (ret != null) {
        const json = ret.substring(ret.indexOf('{'))
        return JSON.parse(json)
      }
      return {}
    },

    async setNpmEnv (list) {
      const cmds = []
      for (const item of list) {
        if (item.value != null) {
          cmds.push(`npm config set ${item.key}  ${item.value}`)
        } else {
          cmds.push(`npm config delete ${item.key}`)
        }
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
    },

    async unsetNpmEnv (list) {
      const cmds = []
      for (const item of list) {
        cmds.push(`npm config delete ${item} `)
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
    },

    async setYarnEnv (list) {
      const cmds = []
      log.debug('yarn set:', JSON.stringify(list))
      for (const item of list) {
        if (item.value != null) {
          cmds.push(`yarn config set ${item.key}  ${item.value}`)
        } else {
          cmds.push(`yarn config delete ${item.key}`)
        }
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
    },

    async unsetYarnEnv (list) {
      const cmds = []
      for (const item of list) {
        cmds.push(`yarn config delete ${item} `)
      }
      const ret = await shell.exec(cmds, { type: 'cmd' })
      return ret
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
          hadSet: currentMap[key] === map[key]
        })
      }
      return list
    },

    async setVariables () {
      const list = await nodeApi.getVariables()
      const noSetList = list.filter(item => {
        return !item.exists
      })
      if (noSetList.length > 0) {
        return nodeApi.setNpmEnv(noSetList)
      }
    },

    async setRegistry ({ registry, type }) {
      if (type === 'npm') {
        await nodeApi.setNpmEnv([{ key: 'registry', value: registry }])
      } else {
        await nodeApi.setYarnEnv([{ key: 'registry', value: registry }])
      }
      return true
    },

    async setProxy (ip, port) {
      const cmds = [
        `npm config set proxy=http://${ip}:${port}`,
        `npm config set https-proxy=http://${ip}:${port}`
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
        cmds.push('npm config set strict-ssl false')
      }
      if (nodeConfig.setting.cafile) {
        cmds.push(`npm config set cafile "${rootCaCertFile}"`)
      }

      if (nodeConfig.setting.NODE_EXTRA_CA_CERTS) {
        cmds.push(`npm config set NODE_EXTRA_CA_CERTS "${rootCaCertFile}"`)
        env.push({ key: 'NODE_EXTRA_CA_CERTS', value: rootCaCertFile })
      }

      if (nodeConfig.setting.NODE_TLS_REJECT_UNAUTHORIZED) {
        cmds.push('npm config set NODE_TLS_REJECT_UNAUTHORIZED 0')
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
      const cmds = [
        'npm config  delete proxy',
        'npm config  delete https-proxy',
        'npm config  delete NODE_EXTRA_CA_CERTS',
        'npm config  delete strict-ssl'
      ]
      const ret = await shell.exec(cmds, { type: 'cmd' })
      event.fire('status', { key: 'plugin.node.enabled', value: false })
      log.info('关闭【NPM】代理成功')
      return ret
    }
  }
  return nodeApi
}

module.exports = {
  key: 'node',
  config: nodeConfig,
  status: {
    enabled: false
  },
  plugin: NodePlugin
}
