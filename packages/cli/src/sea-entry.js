#!/usr/bin/env node
// SEA (Single Executable Application) 入口
// 同进程启动代理，不使用 fork()

const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')

// CLI 命令输出与日志分离：默认日志只写文件，stdout 只输出命令结果
process.env.DEV_SIDECAR_LOG_TO_CONSOLE ??= 'false'

const userBase = path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
const PID_FILE = path.join(userBase, 'ds-cli.pid')

// ── 加载配置 ──────────────────────────────────────────

function loadConfig () {
  const { defaultConfig: defConfig, applyRemoteConfigUrlFix } = require('@blue-frontier/dev-sidecar/src/config/index.js')
  const configLoader = require('@blue-frontier/dev-sidecar/src/config/local-config-loader')
  const mergeApi = require('@blue-frontier/dev-sidecar/src/merge')
  const jsonApi = require('@blue-frontier/mitmproxy/src/json')

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

  return applyRemoteConfigUrlFix(merged)
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
  const mitmproxy = require('@blue-frontier/mitmproxy')

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
// SEA 下 __dirname 就是可执行文件所在目录，显式告诉 core 去哪里找 sysproxy.exe / EnableLoopback.exe，
// 避免依赖启动方式与工作目录（core 的候选顺序是 DS_EXTRA_PATH → resources/extra → __dirname）
if (process.env.DS_EXTRA_PATH == null || process.env.DS_EXTRA_PATH === '') {
  process.env.DS_EXTRA_PATH = path.dirname(process.execPath)
}

const isDaemon = args.includes('--daemon')

if (isDaemon) {
  runDaemon()
} else {
  routeCommand(args)
}

async function runDaemon () {
  const log = require('@blue-frontier/dev-sidecar/src/utils/util.log-or-console')

  async function startup () {
    const log = require('@blue-frontier/dev-sidecar/src/utils/util.log-or-console')

    // 获取实例锁，防止 CLI/GUI 重复运行
    const DevSidecar = require('@blue-frontier/dev-sidecar')
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
      const jsonApi = require('@blue-frontier/mitmproxy/src/json')
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
    const log = require('@blue-frontier/dev-sidecar/src/utils/util.log-or-console')
    log.info('on sigint')
    try {
      const mitmproxy = require('@blue-frontier/mitmproxy')
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
      const DevSidecar = require('@blue-frontier/dev-sidecar')
      // 锁被持有不等于对方还活着：proper-lockfile 的过期判定是 10 秒，
      // 刚停掉的实例会在这段时间内仍显示为「已锁定」。只看锁会让 `stop` 之后紧接着 `start` 被误拒，
      // 因此先看实例记录里的 PID：进程已不在就等锁过期（最多 15 秒）再继续。
      if (await DevSidecar.api.instance.isLocked()) {
        const instance = await DevSidecar.api.instance.readInstance().catch(() => null)
        if (instance?.pid && isPidAlive(instance.pid)) {
          const typeLabel = instance.type === 'gui' ? 'GUI' : 'CLI'
          console.log(`dev-sidecar ${typeLabel} 已在运行中（PID: ${instance.pid}），请先关闭后再启动 CLI`)
          process.exit(0)
        }
        console.log('检测到残留的实例锁（记录中的进程已不在），等待其过期…')
        let cleared = false
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (!await DevSidecar.api.instance.isLocked()) {
            cleared = true
            break
          }
        }
        if (!cleared) {
          console.error('实例锁在 15 秒内没有释放，请稍后重试')
          process.exit(1)
        }
        console.log('锁已释放，继续启动')
      }
      const { fork } = require('node:child_process')
      const child = fork(__filename, ['--daemon'], { detached: true, stdio: 'ignore' })
      child.unref()
      fs.mkdirSync(path.dirname(PID_FILE), { recursive: true })
      fs.writeFileSync(PID_FILE, String(child.pid))
      console.log(`dev-sidecar 已在后台启动，PID: ${child.pid}`)
      // 与 GUI 行为一致：配置里开着系统代理就自动应用，方便用户只跑 start 也能用
      const { readConfig } = require('./commands/gui')
      if (readConfig().proxy?.enabled === true) {
        await runProxyWorker('on')
      }
      process.exit(0)
      break
    }
    case 'stop': {
      const { stopDaemon } = require('./commands/stop')
      await stopDaemon()
      // 停止时把系统代理一并撤掉，避免注册表留在指向已停端口的死代理上
      const { readConfig } = require('./commands/gui')
      if (readConfig().proxy?.enabled === true) {
        await runProxyWorker('off')
      }
      break
    }
    case 'restart': {
      const { restartDaemon } = require('./commands/restart')
      await restartDaemon()
      // 重启后同样按配置应用系统代理
      const { readConfig } = require('./commands/gui')
      if (readConfig().proxy?.enabled === true) {
        await runProxyWorker('on')
      }
      process.exit(0)
      break
    }
    case 'status': {
      const { showStatus } = require('./commands/status')
      showStatus().then(() => process.exit(0))
      break
    }
    case 'config': {
      // 重新拉取用户在 config.json 里指定地址的远程配置（与 GUI 的「重新拉取远程配置」等价）
      if (positional[1] !== 'update' && positional[1] !== 'reload') {
        console.error('用法: ds-cli config update    # 重新拉取 config.json 中指定地址的远程配置')
        process.exit(1)
      }
      const { updateRemoteConfig } = require('./commands/config')
      updateRemoteConfig().then((code) => process.exit(code))
      break
    }
    case 'version': {
      // 必须读 package.json：打包脚本 scripts/build.js Step 6 会执行 <产物> version 并与
      // package.json 的 version 严格比较，写死版本号会让每一次 CI 打包都在这一步失败。
      // esbuild 会把该 JSON 内联进 bundle，因此注入的本地/CI 版本号都能正确带入。
      console.log(require('../package.json').version)
      break
    }
    case 'plugin': {
      const { handlePlugin } = require('./commands/plugin')
      handlePlugin(positional[1], positional[2])
      break
    }
    case 'proxy': {
      const { readConfig, writeConfig } = require('./commands/gui')
      const action = positional[1]
      if (action === 'on' || action === 'off') {
        const config = readConfig()
        config.proxy = config.proxy || {}
        config.proxy.enabled = action === 'on'
        writeConfig(config)
        await runProxyWorker(action)
        process.exit(0)
      } else if (action === 'loopback') {
        // 打开 Windows 回环豁免（UWP/商店应用访问本地代理用），需要管理员权限
        await runProxyWorker('loopback')
        process.exit(0)
      } else {
        console.error('用法: ds-cli proxy <on|off|loopback>')
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
    // 隐藏命令：SEA 下 fork 磁盘上的 .js 不可用（子进程会把路径当命令），
    // 改为由 spawnSelf 重新执行本二进制，再在这里于同进程内加载对应 worker。
    // SEA 下 process.argv 的形状与普通 node 不同（argv[0]、argv[1] 都是 execPath），
    // worker 里按固定下标读参数会错位，因此在入口处扫描 argv 取出参数并写成环境变量，
    // worker 优先读环境变量、退回到 argv（非 SEA 的 fork 路径仍然照旧）。
    case '__worker:proxy': {
      process.env.DS_WORKER_ACTION = workerArg('__worker:proxy', 1)
      require('./proxy-worker')
      break
    }
    case '__worker:plugin': {
      process.env.DS_WORKER_ACTION = workerArg('__worker:plugin', 1)
      process.env.DS_WORKER_NAME = workerArg('__worker:plugin', 2)
      require('./plugin-worker')
      break
    }
    case '__worker:free-eye': {
      require('./free-eye-worker')
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

/** 取出隐藏命令之后的第 n 个参数（n 从 1 开始）；放在顶层以便函数提升 */
/** 通过 worker 子进程设置/取消系统代理（SEA 下 fork 磁盘 .js 不可用，故重新执行自身） */
function runProxyWorker (action) {
  return new Promise((resolve) => {
    const { spawnSelf } = require('./sea')
    const child = spawnSelf(['__worker:proxy', action])
    child.on('exit', (code) => {
      if (code) {
        console.error(`系统代理操作未成功（退出码 ${code}）`)
      }
      resolve(code || 0)
    })
  })
}

/** 进程是否存在（与 commands/stop.js 中同一判据） */
function isPidAlive (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function workerArg (marker, n) {
  const idx = process.argv.indexOf(marker)
  return idx >= 0 ? (process.argv[idx + n] ?? '') : ''
}

function printHelp () {
  console.log(`用法: ds-cli <命令> [选项]

命令:
  start                     启动守护进程
  stop                      停止守护进程
  restart                   重启守护进程
  status                    显示运行状态
  version                   显示版本号
  config update             重新拉取配置里指定地址的远程配置
  proxy on                  开启系统代理
  proxy off                 关闭系统代理
  proxy loopback            打开 Windows 回环豁免（需管理员权限，UWP/商店应用访问本地代理用）
  plugin start <name>       启用插件 (git/node/pip/overwall/free_eye)
  plugin stop <name>        禁用插件
  service install           注册开机自启动
  service uninstall         移除开机自启动
  help                      显示此帮助信息

选项:
  --gui                     仅操作 GUI
  --all                     同时操作 CLI 和 GUI`)
}
