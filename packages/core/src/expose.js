const lodash = require('lodash')
const config = require('./config-api')
const event = require('./event')
const modules = require('./modules')
const shell = require('./shell')
const status = require('./status')
const instance = require('./modules/instance')
const log = require('./utils/util.log.core')

const context = {
  config,
  shell,
  status,
  event,
  log,
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
  if (target == null) {
    // 插件不可用（如 SEA 独立可执行文件中无法携带 free-eye），注册为禁用状态
    log.warn(`插件【${key}】不可用，已注册为禁用状态`)
    const stub = {
      config: { key, enabled: false },
      status: { enabled: false },
      plugin: () => ({
        start: async () => log.warn(`插件【${key}】不可用，无法启动`),
        stop: async () => {},
        close: async () => {},
        run: async () => {
          throw new Error(`插件【${key}】不可用`)
        },
      }),
    }
    const stubApi = setupPlugin(`plugin.${key}`, stub, context, config)
    plugin[key] = stubApi
    continue
  }
  const api = setupPlugin(`plugin.${key}`, target, context, config)
  plugin[key] = api
}
config.resetDefault()
const server = modules.server
const serverStart = server.start

function newServerStart ({ mitmproxyPath, setting }) {
  return serverStart({ mitmproxyPath, plugins: plugin, setting })
}
server.start = newServerStart
async function startup ({ mitmproxyPath, setting }) {
  const conf = config.get()
  const tasks = []

  // 并行启动：服务未监听瞬间的请求失败属计划内行为（代理未开请求同样会失败）
  if (conf.server.enabled && !status.server.enabled) {
    tasks.push((async () => {
      try {
        await server.start({ mitmproxyPath, setting })
      } catch (err) {
        log.error('代理服务启动失败：', err)
      }
    })())
  }
  if (conf.proxy.enabled && !status.proxy.enabled) {
    tasks.push((async () => {
      try {
        await proxy.start()
      } catch (err) {
        log.error('开启系统代理失败：', err)
      }
    })())
  }

  try {
    for (const key in plugin) {
      if (conf.plugin[key].enabled && !status.plugin[key]?.enabled) {
        if (key === 'overwall' && setting && setting.overwall !== true) {
          log.info(`插件【${key}】未启动：setting.json 未开启 overwall`)
          continue
        }
        tasks.push((async () => {
          try {
            await plugin[key].start()
            log.info(`插件【${key}】已启动`)
          } catch (err) {
            log.error(`插件【${key}】启动失败:`, err)
          }
        })())
      }
    }
  } catch (err) {
    log.error('开启插件失败：', err)
  }

  if (tasks.length > 0) {
    // 系统代理与各插件之间没有相互依赖，并行启动以缩短整体等待时间
    await Promise.all(tasks)
  }
}

async function shutdown () {
  const tasks = []

  try {
    for (const key in plugin) {
      if (status.plugin[key] && status.plugin[key].enabled && plugin[key].close) {
        tasks.push((async () => {
          try {
            await plugin[key].close()
            log.info(`插件【${key}】已关闭`)
          } catch (err) {
            log.error(`插件【${key}】关闭失败:`, err)
          }
        })())
      }
    }
  } catch (error) {
    log.error('插件关闭失败:', error)
  }

  if (status.proxy.enabled) {
    tasks.push((async () => {
      try {
        await proxy.close()
        log.info('系统代理已关闭')
      } catch (err) {
        log.error('系统代理关闭失败:', err)
      }
    })())
  }

  if (tasks.length > 0) {
    // 插件关闭（清理 git/npm 配置）与关闭系统代理互不依赖，并行执行
    await Promise.all(tasks)
  }

  if (status.server.enabled) {
    try {
      await server.close()
      log.info('代理服务已关闭')
    } catch (err) {
      log.error('代理服务关闭失败:', err)
    }
  }
}

const api = {
  startup,
  shutdown,
  status: {
    get () {
      return status
    },
  },
  config,
  event,
  shell,
  server,
  proxy,
  plugin,
  instance,
  log,
}
module.exports = {
  status,
  api,
}
