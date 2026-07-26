const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { fork, execSync } = require('node:child_process')
const jsonApi = require('@docmirror/mitmproxy/src/json')

const DEFAULT_PORT = 31181

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
}

function getPidFile () {
  return path.join(getUserBase(), 'ds-cli.pid')
}

function getProxyPort () {
  const configPath = path.join(getUserBase(), 'config.json')
  if (!fs.existsSync(configPath)) return DEFAULT_PORT
  try {
    const config = jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
    return config?.server?.port || DEFAULT_PORT
  } catch {
    return DEFAULT_PORT
  }
}

function isPortInUse (port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => { server.close(); resolve(false) })
    server.listen(port, '127.0.0.1')
  })
}

function isAlive (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function isDsCliProcess (pid) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, { encoding: 'utf-8' })
      return out.toLowerCase().includes('node')
    }
    const out = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf-8' })
    return out.includes('--daemon')
  } catch {
    return false
  }
}

function isRunning () {
  const pidFile = getPidFile()
  if (!fs.existsSync(pidFile)) return false
  const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10)
  if (!isAlive(pid)) return false
  if (!isDsCliProcess(pid)) {
    fs.unlinkSync(pidFile)
    return false
  }
  return true
}

function isGuiRunning () {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /fi "imagename eq dev-sidecar.exe" /fo csv /nh', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return out.includes('dev-sidecar.exe')
    }
    // Linux/macOS: 查找 dev-sidecar 进程，排除 CLI 自身
    const out = execSync('pgrep -x dev-sidecar', { encoding: 'utf-8' }).trim()
    if (!out) return false
    const pids = out.split('\n').filter(Boolean)
    for (const pid of pids) {
      try {
        const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf-8' }).trim()
        if (args.includes('electron') || args.includes('.app') || (!args.includes('--daemon') && !args.includes('ds-cli'))) {
          return true
        }
      } catch {}
    }
    return false
  } catch {
    return false
  }
}

async function startDaemon () {
  if (isRunning()) {
    const pid = fs.readFileSync(getPidFile(), 'utf-8').trim()
    console.log(`dev-sidecar 已在运行中，PID: ${pid}`)
    return
  }

  if (isGuiRunning()) {
    console.log('dev-sidecar GUI 已在运行，请先关闭 GUI 再启动 CLI')
    return
  }

  // 端口占用兜底检测
  const port = getProxyPort()
  if (await isPortInUse(port)) {
    console.log(`代理端口 ${port} 已被占用，dev-sidecar 可能已在运行`)
    return
  }

  const childPath = path.join(__dirname, '../index.js')
  const child = fork(childPath, ['--daemon'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  fs.mkdirSync(path.dirname(getPidFile()), { recursive: true })
  fs.writeFileSync(getPidFile(), String(child.pid))

  console.log(`dev-sidecar 已在后台启动，PID: ${child.pid}`)
}

module.exports = { startDaemon, isRunning, PID_FILE: getPidFile(), getProxyPort, isPortInUse, isAlive, isDsCliProcess, isGuiRunning }
