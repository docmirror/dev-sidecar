const fs = require('node:fs')
const path = require('node:path')
const jsonApi = require('@docmirror/mitmproxy/src/json')
const nodeConfig = require('./config')

function getUserNpmrcPath () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '', '.npmrc')
}

function isKeyInUserNpmrc (key) {
  try {
    if (!fs.existsSync(getUserNpmrcPath())) {
      return false
    }
    const content = fs.readFileSync(getUserNpmrcPath(), 'utf8')
    const target = key.toLowerCase()
    return content.split(/\r?\n/).some((line) => {
      const index = line.indexOf('=')
      if (index <= 0) {
        return false
      }
      return line.slice(0, index).trim().toLowerCase() === target
    })
  } catch {
    return false
  }
}

const NodePlugin = function (context) {
  const { config, shell, event, log } = context
  const nodeApi = {
    async start () {
      try {
        await nodeApi.setVariables()
      } catch (err) {
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
      await nodeApi.setVariables()
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

      // npm config set 支持一次设置多个 key=value，合并成一条命令，避免启动多个 npm 进程拖慢速度
      const setArgs = []
      const deleteKeys = []
      for (const item of list) {
        if (item.value != null && item.value.length > 0 && item.value !== 'default' && item.value !== 'null') {
          setArgs.push(`${item.key}=${item.value}`)
        } else {
          deleteKeys.push(item.key)
        }
      }

      const cmds = []
      if (setArgs.length > 0) {
        cmds.push(`${command} config set ${setArgs.join(' ')}`)
      }
      if (deleteKeys.length > 0) {
        cmds.push(`${command} config delete ${deleteKeys.join(' ')}`)
      }
      return await shell.exec(cmds, { type: 'cmd' })
    },

    async unsetNpmEnv (list) {
      const command = config.get().plugin.node.setting.command || 'npm'

      // npm config delete 支持一次删除多个 key，合并成一条命令
      const keys = list.map((item) => {
        return typeof item === 'string' ? item : item.key
      }).filter(Boolean)
      return await shell.exec([`${command} config delete ${keys.join(' ')}`], { type: 'cmd' })
    },

    async setYarnEnv (list) {
      const cmds = []
      log.debug('yarn set:', JSON.stringify(list))
      for (const item of list) {
        if (item.value != null && item.value.length > 0 && item.value !== 'default' && item.value !== 'null') {
          cmds.push(`yarn config set ${item.key}  ${item.value}`)
        } else {
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

      // 环境变量形式的镜像配置，直接检查 process.env
      const envMap = config.get().plugin.node.envVariables || {}
      const defaultEnvMap = nodeConfig.envVariables || {}
      for (const key in envMap) {
        const oldValue = process.env[key]
        list.push({
          key,
          value: envMap[key],
          oldValue,
          exists: oldValue != null,
          hadSet: oldValue === envMap[key],
          defaultValue: defaultEnvMap[key],
        })
      }
      return list
    },

    async setVariables () {
      const nodeConfig = config.get().plugin.node
      const envMap = nodeConfig.envVariables || {}
      const variables = nodeConfig.variables || {}

      // 清理旧版通过 npm config 写入的镜像变量，避免 npm 未知配置告警。
      // 只有用户级 .npmrc 中确实存在这些 key 时才启动 npm 执行删除，避免每次启动/应用都白跑一遍 npm。
      const staleKeys = Object.keys(envMap).filter((key) => isKeyInUserNpmrc(key))
      if (staleKeys.length > 0) {
        try {
          await nodeApi.unsetNpmEnv(staleKeys)
        } catch (e) {
          log.warn('删除旧的 npm config 镜像变量失败:', e)
        }
      }

      // 每次启动/应用时都强制重写所有镜像环境变量，覆盖手动修改的值
      const envList = Object.keys(envMap).map((key) => {
        return { key, value: envMap[key] }
      })
      if (envList.length > 0) {
        await shell.setSystemEnv({ list: envList })
      }

      // 其余非环境变量形式的 npm config 变量（当前默认为空），仅在确实配置了 variables 时才查询 npm
      if (Object.keys(variables).length > 0) {
        const list = await nodeApi.getVariables()
        const noSetList = list.filter((item) => {
          return !item.hadSet && envMap[item.key] == null
        })
        if (noSetList.length > 0) {
          await nodeApi.setNpmEnv(noSetList)
        }
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
      const command = config.get().plugin.node.setting.command || 'npm'

      // npm config set 支持一次设置多个 key=value，合并成一条命令
      const setArgs = [
        `proxy=http://${ip}:${port - 1}`,
        `https-proxy=http://${ip}:${port}`,
      ]

      const env = []

      /**
       * 'strict-ssl': false,
       * 'cafile': true,
       * 'NODE_EXTRA_CA_CERTS': true,
       * 'NODE_TLS_REJECT_UNAUTHORIZED': false
       */
      const nodeConfig = config.get().plugin.node
      const rootCaCertFile = config.get().server.setting.rootCaFile.certPath
      if (nodeConfig.setting['strict-ssl']) {
        setArgs.push('strict-ssl=false')
      }
      if (nodeConfig.setting.cafile) {
        setArgs.push(`cafile=${rootCaCertFile}`)
      }

      if (nodeConfig.setting.NODE_EXTRA_CA_CERTS) {
        setArgs.push(`NODE_EXTRA_CA_CERTS=${rootCaCertFile}`)
        env.push({ key: 'NODE_EXTRA_CA_CERTS', value: rootCaCertFile })
      }

      if (nodeConfig.setting.NODE_TLS_REJECT_UNAUTHORIZED) {
        setArgs.push('NODE_TLS_REJECT_UNAUTHORIZED=0')
        env.push({ key: 'NODE_TLS_REJECT_UNAUTHORIZED', value: '0' })
      }

      const ret = await shell.exec([`${command} config set ${setArgs.join(' ')}`], { type: 'cmd' })
      if (env.length > 0) {
        await shell.setSystemEnv({ list: env })
      }
      event.fire('status', { key: 'plugin.node.enabled', value: true })
      log.info('开启【NPM】代理成功')

      return ret
    },

    async unsetProxy () {
      const command = config.get().plugin.node.setting.command || 'npm'

      // npm config delete 支持一次删除多个 key，合并成一条命令
      const ret = await shell.exec([`${command} config delete proxy https-proxy strict-ssl cafile NODE_EXTRA_CA_CERTS NODE_TLS_REJECT_UNAUTHORIZED`], { type: 'cmd' })
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
