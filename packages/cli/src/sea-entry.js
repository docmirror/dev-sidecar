#!/usr/bin/env node
// SEA (Single Executable Application) 入口
// 同进程启动代理，不使用 fork()

const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')

const userBase = path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
const PID_FILE = path.join(userBase, 'ds-cli.pid')

// ── 加载配置 ──────────────────────────────────────────

function loadConfig () {
  const defConfig = require('@docmirror/dev-sidecar/src/config/index.js')
  const configLoader = require('@docmirror/dev-sidecar/src/config/local-config-loader')
  const mergeApi = require('@docmirror/dev-sidecar/src/merge')
  const jsonApi = require('@docmirror/mitmproxy/src/json')

  // 读取用户配置
  const userConfigPath = configLoader.getUserConfigPath()
  let userConfig = {}
  if (fs.existsSync(userConfigPath)) {
    try {
      userConfig = jsonApi.parse(fs.readFileSync(userConfigPath, 'utf-8'))
    } catch {}
  }

  // 读取远程配置
  const remoteConfig = configLoader.getRemoteConfig()
  const personalRemoteConfig = configLoader.getRemoteConfig('_personal')

  // 合并（与 core 相同的合并顺序）
  const merged = lodash.cloneDeep(userConfig)
  mergeApi.doMerge(merged, personalRemoteConfig)
  mergeApi.doMerge(merged, remoteConfig)
  mergeApi.doMerge(merged, defConfig)
  mergeApi.doMerge(merged, remoteConfig)
  mergeApi.doMerge(merged, personalRemoteConfig)
  if (userConfig != null) {
    mergeApi.doMerge(merged, userConfig)
  }
  mergeApi.deleteNullItems(merged)

  return merged
}

// ── 准备服务配置 ──────────────────────────────────────

function prepareServerConfig (allConfig) {
  const serverConfig = lodash.cloneDeep(allConfig.server)
  const intercepts = serverConfig.intercepts
  const dnsMapping = serverConfig.dns.mapping

  if (allConfig.plugin) {
    lodash.each(allConfig.plugin, (value) => {
      const plugin = value
      if (!plugin.enabled) return
      if (plugin.intercepts) lodash.merge(intercepts, plugin.intercepts)
      if (plugin.dns) lodash.merge(dnsMapping, plugin.dns)
    })
  }

  if (allConfig.app) serverConfig.app = allConfig.app
  if (serverConfig.intercept.enabled === false) serverConfig.intercepts = {}
  serverConfig.plugin = allConfig.plugin
  if (allConfig.proxy && allConfig.proxy.enabled) serverConfig.proxy = allConfig.proxy

  return serverConfig
}

// ── 启动代理 ──────────────────────────────────────────

async function startProxy (serverConfig) {
  const mitmproxy = require('@docmirror/mitmproxy')

  // 设置 CA 证书路径
  if (serverConfig.setting && serverConfig.setting.userBasePath) {
    mitmproxy.config.setDefaultCABasePath(serverConfig.setting.userBasePath)
  }

  // 设置根目录（GUI 脚本路径）
  serverConfig.setting.rootDir = path.join(userBase, '../dev-sidecar-gui/')

  await mitmproxy.start(serverConfig)
  return mitmproxy
}

// ── 主流程 ──────────────────────────────────────────

const args = process.argv.slice(2)
const isDaemon = args.includes('--daemon')

if (isDaemon) {
  runDaemon()
} else {
  routeCommand(args)
}

async function runDaemon () {
  const log = require('@docmirror/dev-sidecar/src/utils/util.log-or-console')

  async function startup () {
    const log = require('@docmirror/dev-sidecar/src/utils/util.log-or-console')

    // 获取实例锁，防止 CLI/GUI 重复运行
    const DevSidecar = require('@docmirror/dev-sidecar')
    try {
      await DevSidecar.api.instance.acquireLock({ log })
    } catch (e) {
      log.error('另一个 dev-sidecar 实例正在运行，CLI 启动失败:', e.message)
      process.exit(1)
    }
    try {
      await DevSidecar.api.instance.writeInstance({
        type: 'cli',
        pid: process.pid,
        command: process.argv.join(' '),
        startTime: new Date().toISOString(),
      })
    } catch (e) {
      log.error('写入 running.json 实例信息失败:', e.message)
    }

    const BANNER = `    ____                 _____ _     __
   / __ \\___ _   __     / ___/(_)___/ /__  _________ ______
  / / / / _ \\ | / /_____\\__ \\/ / __  / _ \\/ ___/ __ \`/ ___/
 / /_/ /  __/ |/ /_____/__/ / / /_/ /  __/ /__/ /_/ / /
/_____/\\___/|___/     /____/_/\\__,_/\\___/\\___/\\__,_/_/


==================== 开发者边车 ====================`
    log.info(BANNER)

    const allConfig = loadConfig()
    const serverConfig = prepareServerConfig(allConfig)

    // 写入 running.json（供调试），保留现有 instance 信息
    const runningConfigPath = path.join(userBase, 'running.json')
    try {
      const jsonApi = require('@docmirror/mitmproxy/src/json')
      let existingInstance
      if (fs.existsSync(runningConfigPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(runningConfigPath, 'utf-8'))
          existingInstance = existing?.app?.instance
        } catch {}
      }
      if (existingInstance) {
        if (!serverConfig.app) {
          serverConfig.app = {}
        }
        serverConfig.app.instance = existingInstance
      }
      fs.writeFileSync(runningConfigPath, jsonApi.stringify(serverConfig))
    } catch {}

    const mitmproxy = await startProxy(serverConfig)
    log.info('dev-sidecar 已启动（同进程模式）')

    // 主动同步状态到 running.json（SEA 模式不走 core 的 server/proxy 模块，状态事件不会自动触发）
    DevSidecar.api.instance.updateStatus('server.enabled', true)
    DevSidecar.api.instance.updateStatus('proxy.enabled', !!(allConfig.proxy && allConfig.proxy.enabled))
  }

  async function onClose () {
    const log = require('@docmirror/dev-sidecar/src/utils/util.log-or-console')
    log.info('on sigint')
    try {
      const mitmproxy = require('@docmirror/mitmproxy')
      await mitmproxy.close()
    } catch {}
    log.info('on closed')
    cleanupFiles()
    process.exit(0)
  }

  function cleanupFiles () {
    try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE) } catch {}
  }

  process.on('SIGINT', onClose)
  process.on('SIGTERM', onClose)
  process.on('exit', cleanupFiles)

  await startup()
}

async function routeCommand (args) {
  const flags = args.filter(a => a.startsWith('--'))
  const positional = args.filter(a => !a.startsWith('--'))
  const command = positional[0] || 'start'

  switch (command) {
    case 'start': {
      // 锁检查：锁被持有说明 CLI 或 GUI 已在运行
      const DevSidecar = require('@docmirror/dev-sidecar')
      if (await DevSidecar.api.instance.isLocked()) {
        const instance = await DevSidecar.api.instance.readInstance()
        const typeLabel = instance?.type === 'gui' ? 'GUI' : 'CLI'
        console.log(`dev-sidecar ${typeLabel} 已在运行中${instance?.pid ? `（PID: ${instance.pid}）` : ''}，请先关闭后再启动 CLI`)
        process.exit(0)
        break
      }
      const { fork } = require('node:child_process')
      const child = fork(__filename, ['--daemon'], { detached: true, stdio: 'ignore' })
      child.unref()
      fs.mkdirSync(path.dirname(PID_FILE), { recursive: true })
      fs.writeFileSync(PID_FILE, String(child.pid))
      console.log(`dev-sidecar 已在后台启动，PID: ${child.pid}`)
      process.exit(0)
      break
    }
    case 'stop': {
      const { stopDaemon } = require('./commands/stop')
      stopDaemon()
      break
    }
    case 'restart': {
      const { restartDaemon } = require('./commands/restart')
      restartDaemon().then(() => process.exit(0))
      break
    }
    case 'status': {
      const { showStatus } = require('./commands/status')
      showStatus().then(() => process.exit(0))
      break
    }
    case 'version': {
      console.log('2.2.1')
      break
    }
    case 'plugin': {
      const { handlePlugin } = require('./commands/plugin')
      handlePlugin(positional[1], positional[2])
      break
    }
    case 'proxy': {
      const { readConfig, writeConfig } = require('./commands/gui')
      if (positional[1] === 'on' || positional[1] === 'off') {
        const config = readConfig()
        config.proxy = config.proxy || {}
        config.proxy.enabled = positional[1] === 'on'
        writeConfig(config)

        const { fork } = require('node:child_process')
        const workerPath = path.join(__dirname, 'proxy-worker.js')
        const child = fork(workerPath, [positional[1]])
        child.on('exit', (code) => {
          process.exit(code || 0)
        })
      } else {
        console.error('用法: ds-cli proxy <on|off>')
        process.exit(1)
      }
      break
    }
    case 'service': {
      const { install, uninstall } = require('./commands/service')
      if (positional[1] === 'install') install()
      else if (positional[1] === 'uninstall') uninstall()
      else {
        console.error('用法: ds-cli service <install|uninstall>')
        process.exit(1)
      }
      break
    }
    case 'help': {
      printHelp()
      break
    }
    default:
      console.error(`未知命令: ${command}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp () {
  console.log(`用法: ds-cli <命令> [选项]

命令:
  start                     启动守护进程
  stop                      停止守护进程
  restart                   重启守护进程
  status                    显示运行状态
  version                   显示版本号
  proxy on                  开启系统代理
  proxy off                 关闭系统代理
  plugin start <name>       启用插件 (git/node/pip/overwall/free_eye)
  plugin stop <name>        禁用插件
  service install           注册开机自启动
  service uninstall         移除开机自启动
  help                      显示此帮助信息

选项:
  --gui                     仅操作 GUI
  --all                     同时操作 CLI 和 GUI`)
}
