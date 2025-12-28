const fs = require('node:fs')
const path = require('node:path')
const clientModule = require('./client')

const runTests = (clientModule && (clientModule.runTests || (clientModule.default && clientModule.default.runTests)))
const freeEyeConfig = require('./config')

const PLUGIN_STATUS_KEY = 'plugin.free_eye'

const FreeEyePlugin = function (context) {
  const { config, event, log } = context
  let lastResult = null

  const resolvePath = (targetPath, defaultRelative) => {
    const fallback = path.join(__dirname, defaultRelative)
    if (!targetPath) {
      return fallback
    }
    if (path.isAbsolute(targetPath)) {
      return targetPath
    }
    const candidates = [
      path.join(__dirname, targetPath),
      path.join(process.cwd(), targetPath),
    ]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
    return fallback
  }

  const emitStatus = (key, value) => {
    event.fire('status', { key, value })
  }

  const captureLogs = async (executor) => {
    const logs = []
    const originalLog = console.log
    const originalError = console.error
    const push = (level, args) => {
      const message = args.map((item) => {
        if (item instanceof Error) {
          return item.stack || item.message
        }
        if (typeof item === 'object') {
          try {
            return JSON.stringify(item)
          } catch (err) {
            return String(item)
          }
        }
        return String(item)
      }).join(' ')
      logs.push({ level, message, timestamp: Date.now() })
      // Also write to system log so it follows configured logging format
      if (level === 'error') {
        log.error(message)
      } else {
        log.info(message)
      }
    }
    console.log = (...args) => {
      push('info', args)
      originalLog(...args)
    }
    console.error = (...args) => {
      push('error', args)
      originalError(...args)
    }
    try {
      const result = await executor()
      return { result, logs }
    } finally {
      console.log = originalLog
      console.error = originalError
    }
  }

  const storeResult = (payload) => {
    lastResult = payload
    emitStatus(`${PLUGIN_STATUS_KEY}.result`, lastResult)
  }

  const executeTests = async () => {
    const currentConfig = config.get()
    const pluginConfig = currentConfig.plugin.free_eye || {}
    const setting = pluginConfig.setting || {}
    const configFilePath = resolvePath(setting.testsConfigFile, 'config.json')
    const testsDir = resolvePath(setting.testsDir, 'checkpoints')
    log.info(`FreeEye tests triggering, config=${configFilePath}, testsDir=${testsDir}`)
    try {
      const { result, logs } = await captureLogs(() => runTests({ configPath: configFilePath, testsDir }))
      const payload = {
        finishedAt: new Date().toISOString(),
        totalTests: result.totalTests,
        completedTests: result.completedTests,
        summaries: result.summaries,
        results: result.results,
        logs,
      }
      storeResult(payload)
      return payload
    } catch (err) {
      const payload = {
        finishedAt: new Date().toISOString(),
        error: err.message,
      }
      storeResult(payload)
      throw err
    }
  }

  const api = {
    async start () {
      emitStatus(`${PLUGIN_STATUS_KEY}.enabled`, true)
      log.info('启动【FreeEye】插件')
      try {
        return await executeTests()
      } catch (err) {
        log.error('FreeEye runTests failed:', err)
        throw err
      }
    },

    async close () {
      emitStatus(`${PLUGIN_STATUS_KEY}.enabled`, false)
      log.info('关闭【FreeEye】插件')
    },

    async restart () {
      await api.close()
      return api.start()
    },

    isEnabled () {
      const pluginConfig = config.get().plugin.free_eye
      return pluginConfig && pluginConfig.enabled
    },

    async run () {
      return executeTests()
    },

    async getLastResult () {
      return lastResult
    },
  }
  return api
}

module.exports = {
  key: 'free_eye',
  config: freeEyeConfig,
  status: {
    enabled: false,
    result: null,
  },
  plugin: FreeEyePlugin,
}
