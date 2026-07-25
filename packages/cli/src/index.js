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

// ── 命令路由 ──────────────────────────────────────────────

function routeCommand (args) {
  // 过滤掉 flag 参数，提取命令和值
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
      const pkg = require('../../package.json')
      console.log(pkg.version)
      break
    }
    case 'plugin': {
      const { handlePlugin } = require('./commands/plugin')
      handlePlugin(value, positional[2])
      break
    }
    default:
      console.error(`未知命令: ${command}`)
      console.error('用法: ds-cli [start|stop|restart|status|version|plugin <start|stop> <name>] [--gui|--all]')
      process.exit(1)
  }
}
