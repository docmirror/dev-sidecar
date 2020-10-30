const status = require('./status')
const config = require('./config')
const event = require('./event')
const shell = require('./shell')
const modules = require('./modules')
const proxyConfig = require('./lib/proxy/common/config')
const lodash = require('lodash')
const context = {
  config,
  shell,
  status,
  event,
  rootCaFile: proxyConfig.getDefaultCACertPath()
}

function setupPlugin (key, plugin, context, config) {
  const pluginConfig = plugin.config
  const PluginClass = plugin.plugin
  const pluginStatus = plugin.status
  const api = PluginClass(context)
  config.addDefault(key, pluginConfig)
  lodash.set(status, key, pluginStatus)
  return api
}

function fireStatus (target) {
  event.fire('status', target)
}

const server = modules.server
const proxy = setupPlugin('proxy', modules.proxy, context, config)
const plugin = {}
for (const key in modules.plugin) {
  const target = modules.plugin[key]
  const api = setupPlugin('plugin.' + key, target, context, config)
  plugin[key] = api
}
config.resetDefault()

module.exports = {
  status,
  api: {
    startup: async (newConfig) => {
      if (newConfig) {
        config.set(newConfig)
      }
      const conf = config.get()
      if (conf.server.enabled) {
        try {
          const cfg = await server.start()
          fireStatus({ key: 'server.enabled', value: true })
          console.log('代理服务已启动：127.0.0.1:' + cfg.port)
        } catch (err) {
          fireStatus({ key: 'server.enabled', value: false })
          console.error('代理服务启动失败：', err)
        }
      }
      if (conf.proxy.enabled) {
        try {
          const ret = await proxy.start()
          fireStatus({ key: 'proxy.enabled', value: true })
          console.log(`开启系统代理成功：${ret.ip}:${ret.port}`)
        } catch (err) {
          fireStatus({ key: 'proxy.enabled', value: false })
          console.error('开启系统代理失败：', err)
        }
      }
      const plugins = []
      for (const key in plugin) {
        if (conf.plugin[key].enabled) {
          const start = async () => {
            try {
              await plugin[key].start()
              console.log(`插件【${key}】已启动`)
            } catch (err) {
              console.log(`插件【${key}】启动失败`, err)
            }
          }
          plugins.push(start())
        }
      }
      await Promise.all(plugins)
    },
    shutdown: async () => {
      try {
        const plugins = []
        for (const key in plugin) {
          if (status.plugin[key].enabled && plugin[key].close) {
            const close = async () => {
              try {
                await plugin[key].close()
                console.log(`插件【${key}】已关闭`)
              } catch (err) {
                console.log(`插件【${key}】关闭失败`, err)
              }
            }
            plugins.push(close())
          }
        }
        await Promise.all(plugins)

        if (status.proxy.enabled) {
          try {
            await proxy.close()
            console.log('系统代理已关闭')
          } catch (err) {
            console.log('系统代理关闭失败', err)
          }
        }
        if (status.server.enabled) {
          try {
            await server.close()
            console.log('代理服务已关闭')
          } catch (err) {
            console.log('代理服务关闭失败', err)
          }
        }
      } catch (error) {
        console.log(error)
      }
    },
    status: {
      get () {
        return status
      }
    },
    config,
    event,
    shell,
    server,
    proxy,
    plugin
  }
}
