#!/usr/bin/env node
// SEA (Single Executable Application) 入口
// 同进程启动代理，不使用 fork()

const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')

const userBase = path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
const PID_FILE = path.join(userBase, 'ds-cli.pid')
const STATUS_FILE = path.join(userBase, 'status.json')

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
    const BANNER = `    ____                 _____ _     __
   / __ \\___ _   __     / ___/(_)___/ /__  _________ ______
  / / / / _ \\ | / /_____\\__ \\/ / __  / _ \\/ ___/ __ \`/ ___/
 / /_/ /  __/ |/ /_____/__/ / / /_/ /  __/ /__/ /_/ / /
/_____/\\___/|___/     /____/_/\\__,_/\\___/\\___/\\__,_/_/


==================== 开发者边车 ====================`
    log.info(BANNER)

    const allConfig = loadConfig()
    const serverConfig = prepareServerConfig(allConfig)

    // 写入 running.json（供调试）
    const runningConfigPath = path.join(userBase, 'running.json')
    try {
      const jsonApi = require('@docmirror/mitmproxy/src/json')
      fs.writeFileSync(runningConfigPath, jsonApi.stringify(serverConfig))
    } catch {}

    const mitmproxy = await startProxy(serverConfig)
    log.info('dev-sidecar 已启动（同进程模式）')

    // 定期写入 status.json
    writeStatus()
    setInterval(writeStatus, 5000)
  }

  function writeStatus () {
    try {
      const status = {
        server: { enabled: true },
        proxy: { enabled: false },
        plugin: {},
      }
      fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
    } catch {}
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
    try { if (fs.existsSync(STATUS_FILE)) fs.unlinkSync(STATUS_FILE) } catch {}
  }

  process.on('SIGINT', onClose)
  process.on('SIGTERM', onClose)
  process.on('exit', cleanupFiles)

  await startup()
}

function routeCommand (args) {
  const flags = args.filter(a => a.startsWith('--'))
  const positional = args.filter(a => !a.startsWith('--') && a !== '-h')

  if (flags.includes('--help') || flags.includes('-h') || args.includes('-h')) {
    printHelp()
    return
  }

  const command = positional[0] || 'start'

  switch (command) {
    case 'start': {
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
      const { isGuiRunning } = require('./commands/gui')
      showStatus()
      console.log(`  GUI:       ${isGuiRunning() ? '运行中' : '未运行'}`)
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
      if (flags.includes('--help') || flags.includes('-h')) {
        printHelp()
      } else {
        console.error(`未知命令: ${command}`)
        printHelp()
        process.exit(1)
      }
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
  plugin start <name>       启动插件 (git/node/pip/overwall/free_eye)
  plugin stop <name>        停止插件
  service install           注册开机自启动
  service uninstall         移除开机自启动
  help                      显示此帮助信息

选项:
  --gui                     仅操作 GUI
  --all                     同时操作 CLI 和 GUI
  -h, --help                显示帮助信息`)
}
