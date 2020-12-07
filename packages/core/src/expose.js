const status = require('./status')
const config = require('./config')
const event = require('./event')
const shell = require('./shell')
const modules = require('./modules')
const lodash = require('lodash')
const log = require('./utils/util.log')
const context = {
  config,
  shell,
  status,
  event,
  log
}

function setupPlugin (key, plugin, context, config) {
  const pluginConfig = plugin.config
  const PluginClass = plugin.plugin
  const pluginStatus = plugin.status
  const api = PluginClass(context)
  config.addDefault(key, pluginConfig)
  if (pluginStatus) {
    lodash.set(status, key, pluginStatus)
  }

  return api
}

const proxy = setupPlugin('proxy', modules.proxy, context, config)
const plugin = {}
for (const key in modules.plugin) {
  const target = modules.plugin[key]
  const api = setupPlugin('plugin.' + key, target, context, config)
  plugin[key] = api
}
config.resetDefault()
const server = modules.server
const serverStart = server.start

const newServerStart = ({ mitmproxyPath }) => {
  return serverStart({ mitmproxyPath, plugins: plugin })
}
server.start = newServerStart
async function startup ({ mitmproxyPath }) {
  const conf = config.get()
  if (conf.server.enabled) {
    try {
      await server.start({ mitmproxyPath })
    } catch (err) {
      log.error('代理服务启动失败：', err)
    }
  }
  if (conf.proxy.enabled) {
    try {
      await proxy.start()
    } catch (err) {
      log.error('开启系统代理失败：', err)
    }
  }
  try {
    const plugins = []
    for (const key in plugin) {
      if (conf.plugin[key].enabled) {
        const start = async () => {
          try {
            await plugin[key].start()
            log.info(`插件【${key}】已启动`)
          } catch (err) {
            log.error(`插件【${key}】启动失败`, err)
          }
        }
        plugins.push(start())
      }
    }
    if (plugins && plugins.length > 0) {
      await Promise.all(plugins)
    }
  } catch (err) {
    log.error('开启插件失败：', err)
  }
}

async function shutdown () {
  try {
    const plugins = []
    for (const key in plugin) {
      if (status.plugin[key].enabled && plugin[key].close) {
        const close = async () => {
          try {
            await plugin[key].close()
            log.info(`插件【${key}】已关闭`)
          } catch (err) {
            log.info(`插件【${key}】关闭失败`, err)
          }
        }
        plugins.push(close())
      }
    }
    if (plugins.length > 0) {
      await Promise.all(plugins)
    }
  } catch (error) {
    log.error('插件关闭失败'.error)
  }

  if (status.proxy.enabled) {
    try {
      await proxy.close()
      log.info('系统代理已关闭')
    } catch (err) {
      log.error('系统代理关闭失败', err)
    }
  }
  if (status.server.enabled) {
    try {
      await server.close()
      log.info('代理服务已关闭')
    } catch (err) {
      log.error('代理服务关闭失败', err)
    }
  }
}

const api = {
  startup,
  shutdown,
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
  plugin,
  log
}
module.exports = {
  status,
  api
}
