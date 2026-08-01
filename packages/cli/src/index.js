const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const isDaemon = args.includes('--daemon')

if (isDaemon) {
  runDaemon()
} else {
  routeCommand(args)
}

// ── 守护进程模式 ──────────────────────────────────────────

function runDaemon () {
  const DevSidecar = require('@docmirror/dev-sidecar')
  const log = require('@docmirror/dev-sidecar/src/utils/util.log-or-console')

  const mitmproxyPath = path.join(__dirname, 'mitmproxy.js')

  const userBasePath = path.join(
    process.env.USERPROFILE || process.env.HOME || '/',
    '.dev-sidecar',
  )
  const PID_FILE = path.join(userBasePath, 'ds-cli.pid')
  const STATUS_FILE = path.join(userBasePath, 'status.json')

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

    // 定期写入 status.json
    writeStatus()
    setInterval(writeStatus, 5000)
  }

  function writeStatus () {
    try {
      const status = DevSidecar.api.status.get()
      fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
    } catch (e) {
      log.error('写入 status.json 失败:', e.message)
    }
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
    try { if (fs.existsSync(STATUS_FILE)) fs.unlinkSync(STATUS_FILE) } catch {}
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
      Promise.all(tasks).then(() => process.exit(0))
      break
    }
    case 'stop': {
      const { stopDaemon } = require('./commands/stop')
      const { stopGui } = require('./commands/gui')
      if (runCli) stopDaemon()
      if (runGui) stopGui()
      break
    }
    case 'restart': {
      const { restartDaemon } = require('./commands/restart')
      const { restartGui } = require('./commands/gui')
      const tasks = []
      if (runCli) tasks.push(restartDaemon())
      if (runGui) tasks.push(Promise.resolve(restartGui()))
      Promise.all(tasks).then(() => process.exit(0))
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
      } else {
        console.error('用法: ds-cli proxy <on|off>')
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
