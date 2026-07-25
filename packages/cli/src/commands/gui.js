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
  const port = getProxyPort()
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -aon | find ":${port}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
      return out.includes('LISTENING')
    }
    execSync(`lsof -i :${port} -sTCP:LISTEN`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getGuiPidByPort () {
  const port = getProxyPort()
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -aon | find ":${port}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
      const lines = out.split(/\r?\n/)
      for (const line of lines) {
        if (!line.includes('LISTENING')) continue
        const parts = line.trim().split(/\s+/)
        const pid = parseInt(parts[parts.length - 1], 10)
        if (pid && pid > 0) return pid
      }
      return null
    }
    const out = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf-8' }).trim()
    return out ? parseInt(out.split('\n')[0], 10) : null
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

module.exports = { isGuiRunning, isPortInUse, getProxyPort, startGui, stopGui, restartGui }
