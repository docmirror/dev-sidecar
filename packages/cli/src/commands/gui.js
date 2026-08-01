const fs = require('node:fs')
const path = require('node:path')
const { execSync, spawn } = require('node:child_process')
const net = require('node:net')
const jsonApi = require('@docmirror/mitmproxy/src/json')

const DEFAULT_PORT = 31181

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
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

function isGuiRunningSync () {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /fi "imagename eq dev-sidecar.exe" /fo csv /nh', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return out.includes('dev-sidecar.exe')
    }
    // Linux/macOS: 检查 dev-sidecar (Electron GUI) 进程
    // GUI 进程特征：包含 electron 或 .app（macOS 应用包）
    const out = execSync('pgrep -x dev-sidecar', { encoding: 'utf-8' }).trim()
    if (!out) return false
    const pids = out.split('\n').filter(Boolean)
    for (const pid of pids) {
      try {
        const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf-8' }).trim()
        if (args.includes('electron') || args.includes('.app')) {
          return true
        }
      } catch {}
    }
    return false
  } catch {
    return false
  }
}

function getGuiPidByPort () {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /fi "imagename eq dev-sidecar.exe" /fo csv /nh', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const lines = out.split(/\r?\n/).filter(l => l.includes('dev-sidecar.exe'))
      if (lines.length > 0) {
        const match = lines[0].match(/"(\d+)"/)
        return match ? parseInt(match[1], 10) : null
      }
      return null
    }
    // Linux/macOS: 查找 GUI 进程
    const out = execSync('pgrep -x dev-sidecar', { encoding: 'utf-8' }).trim()
    if (!out) return null
    const pids = out.split('\n').filter(Boolean)
    for (const pid of pids) {
      try {
        const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf-8' }).trim()
        if (args.includes('electron') || args.includes('.app') || (!args.includes('--daemon') && !args.includes('ds-cli'))) {
          return parseInt(pid, 10)
        }
      } catch {}
    }
    return null
  } catch {
    return null
  }
}

function isGuiRunning () {
  return isGuiRunningSync()
}

function startGui () {
  if (isGuiRunningSync()) {
    console.log('dev-sidecar GUI 已在运行')
    return
  }

  if (process.platform === 'darwin') {
    spawn('open', ['-a', 'dev-sidecar'], { detached: true, stdio: 'ignore' }).unref()
  } else if (process.platform === 'win32') {
    execSync('start "" "dev-sidecar"', { stdio: 'ignore' })
  } else {
    const paths = [
      '/opt/dev-sidecar/dev-sidecar',
      '/usr/bin/dev-sidecar',
      '/usr/local/bin/dev-sidecar',
      'dev-sidecar',
    ]
    for (const p of paths) {
      try {
        spawn(p, [], { detached: true, stdio: 'ignore', env: process.env }).unref()
        break
      } catch {}
    }
  }

  console.log('dev-sidecar GUI 已启动')
}

function stopGui () {
  const pid = getGuiPidByPort()
  if (!pid) {
    console.log('dev-sidecar GUI 未在运行')
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
    console.log(`已发送停止信号到 GUI 进程 (PID: ${pid})`)
  } catch (e) {
    console.error(`停止 GUI 失败: ${e.message}`)
  }
}

function restartGui () {
  stopGui()
  let waited = 0
  const interval = setInterval(() => {
    if (!isGuiRunningSync() || waited >= 5000) {
      clearInterval(interval)
      startGui()
    }
    waited += 200
  }, 200)
}

function readConfig () {
  const configPath = path.join(getUserBase(), 'config.json')
  if (!fs.existsSync(configPath)) return {}
  try {
    return jsonApi.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeConfig (config) {
  const configPath = path.join(getUserBase(), 'config.json')
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, jsonApi.stringify(config))
}

module.exports = {
  isGuiRunning, isPortInUse, getProxyPort,
  startGui, stopGui, restartGui,
  readConfig, writeConfig,
}
