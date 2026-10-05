const fs = require('node:fs')
const path = require('node:path')

// CLI 命令输出与日志分离：默认日志只写文件，stdout 只输出命令结果；
// 调试时可显式设置 DEV_SIDECAR_LOG_TO_CONSOLE=true
process.env.DEV_SIDECAR_LOG_TO_CONSOLE ??= 'false'

const args = process.argv.slice(2)
const isDaemon = args.includes('--daemon')

if (isDaemon) {
  runDaemon()
} else {
  routeCommand(args)
}

// ── 守护进程模式 ──────────────────────────────────────────

function runDaemon () {
  const DevSidecar = require('@blue-frontier/dev-sidecar')
  const log = require('@blue-frontier/dev-sidecar/src/utils/util.log-or-console')

  const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')

  const userBasePath = path.join(
    process.env.USERPROFILE || process.env.HOME || '/',
    '.dev-sidecar',
  )
  const PID_FILE = path.join(userBasePath, 'ds-cli.pid')

  async function startup () {
    // 获取实例锁，防止 CLI/GUI 重复运行
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

    const banner = fs.readFileSync(path.join(__dirname, 'banner.txt'))
    log.info(banner.toString())

    DevSidecar.api.config.reload()
    await DevSidecar.api.startup({ mitmproxyPath })
    await DevSidecar.api.config.startAutoDownloadRemoteConfig()
    log.info('dev-sidecar 已启动')
  }

  async function onClose () {
    log.info('on sigint')
    await DevSidecar.api.shutdown()
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

  startup()
}

// ── 帮助信息 ──────────────────────────────────────────────

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
  plugin start <name>       启用插件 (git/node/pip/overwall/free_eye)
  plugin stop <name>        禁用插件
  service install           注册开机自启动
  service uninstall         移除开机自启动
  help                      显示此帮助信息

选项:
  --gui                     仅操作 GUI
  --all                     同时操作 CLI 和 GUI`)
}

// ── 命令路由 ──────────────────────────────────────────────

function routeCommand (args) {
  const flags = args.filter(a => a.startsWith('--'))
  const positional = args.filter(a => !a.startsWith('--'))
  const command = positional[0] || 'start'
  const value = positional[1]

  const guiMode = flags.includes('--gui')
  const allMode = flags.includes('--all')

  const runCli = !guiMode || allMode
  const runGui = guiMode || allMode

  switch (command) {
    case 'start': {
      const { startDaemon } = require('./commands/start')
      const { startGui } = require('./commands/gui')
      const tasks = []
      if (runCli) tasks.push(startDaemon())
      if (runGui) tasks.push(Promise.resolve(startGui()))
      Promise.all(tasks).then(() => {
        // 与 GUI 一致：配置里开着系统代理就自动应用（必须放在守护进程起来之后）
        if (runCli && require('./commands/gui').readConfig().proxy?.enabled === true) {
          const { fork } = require('node:child_process')
          fork(path.join(__dirname, 'proxy-worker.js'), ['on']).on('exit', () => process.exit(0))
          return
        }
        process.exit(0)
      })
      break
    }
    case 'stop': {
      const { stopDaemon } = require('./commands/stop')
      const { stopGui } = require('./commands/gui')
      if (runGui) stopGui()
      if (runCli) {
        const enabled = require('./commands/gui').readConfig().proxy?.enabled === true
        // 等守护进程真的退出后再撤代理：否则可能留下指向已停端口的死代理
        stopDaemon().then(() => {
          if (enabled) {
            const { fork } = require('node:child_process')
            fork(path.join(__dirname, 'proxy-worker.js'), ['off']).on('exit', () => process.exit(0))
            return
          }
          process.exit(0)
        })
        return
      }
      break
    }
    case 'restart': {
      const { restartDaemon } = require('./commands/restart')
      const { restartGui } = require('./commands/gui')
      const tasks = []
      if (runCli) tasks.push(restartDaemon())
      if (runGui) tasks.push(Promise.resolve(restartGui()))
      Promise.all(tasks).then(() => {
        if (runCli && require('./commands/gui').readConfig().proxy?.enabled === true) {
          const { fork } = require('node:child_process')
          fork(path.join(__dirname, 'proxy-worker.js'), ['on']).on('exit', () => process.exit(0))
          return
        }
        process.exit(0)
      })
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
      const pkgPath = path.join(__dirname, '../package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      console.log(pkg.version)
      break
    }
    case 'plugin': {
      const { handlePlugin } = require('./commands/plugin')
      handlePlugin(value, positional[2])
      break
    }
    case 'proxy': {
      const { readConfig, writeConfig } = require('./commands/gui')
      if (value === 'on' || value === 'off') {
        // 持久化到 config.json
        const config = readConfig()
        config.proxy = config.proxy || {}
        config.proxy.enabled = value === 'on'
        writeConfig(config)

        // fork worker 立即设置/取消系统代理
        const { fork } = require('node:child_process')
        const workerPath = path.join(__dirname, 'proxy-worker.js')
        const child = fork(workerPath, [value])
        child.on('exit', (code) => {
          process.exit(code || 0)
        })
      } else if (value === 'loopback') {
        // 打开 Windows 回环豁免，需要管理员权限
        const { fork } = require('node:child_process')
        const workerPath = path.join(__dirname, 'proxy-worker.js')
        const child = fork(workerPath, ['loopback'])
        child.on('exit', (code) => {
          process.exit(code || 0)
        })
      } else {
        console.error('用法: ds-cli proxy <on|off|loopback>')
        process.exit(1)
      }
      break
    }
    case 'service': {
      const { install, uninstall } = require('./commands/service')
      if (value === 'install') install()
      else if (value === 'uninstall') uninstall()
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
      process.exit(1)
  }
}
