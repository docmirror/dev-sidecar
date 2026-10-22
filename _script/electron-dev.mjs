import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

const guiDir = process.cwd()
const repoRoot = path.resolve(guiDir, '..', '..')
const require = createRequire(import.meta.url)
// electron 是 packages/gui 的 devDependency，pnpm 不会把它提升到仓库根，
// 因此必须按 gui 目录解析，否则本文件从 _script/ 解析会 MODULE_NOT_FOUND。
const guiRequire = createRequire(path.join(guiDir, 'package.json'))
// Chromium 沙箱初始化失败时进程以 STATUS_BREAKPOINT(0x80000003) 退出，
// Node 在 Windows 上可能报无符号值或 PowerShell 风格的负值，这里都覆盖。
const SANDBOX_CRASH_CODES = new Set([0x80000003, -2147483645])
// 本机已知问题：electron.exe 位于仓库目录内时，Chromium 沙箱创建备用窗口站会失败
// （转储里 CreateAlternateDesktop 返回 0xC = SBOX_ERROR_CANNOT_CREATE_WINSTATION），
// 随后 CHECK 失败以 0xC000001D 退出。原因是工作区沙箱给文件打了 Low 完整性标签，
// 进程被以 Low 令牌创建。优先把 dist 标签改成 Medium；失败时退回仓库外副本。
const DEV_ELECTRON_CACHE = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  'dev-sidecar-dev-electron',
)

function resolveDevServer () {
  const argv = process.argv.slice(2)
  const portIndex = argv.indexOf('--port')
  const port = portIndex >= 0 ? Number.parseInt(argv[portIndex + 1], 10) : 8080
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`无效的端口号: ${argv[portIndex + 1]}`)
  }
  return { port, url: `http://localhost:${port}` }
}

const { port: devServerPort, url: devServerUrl } = resolveDevServer()
const state = {
  closing: false,
  devServer: null,
  electron: null,
}

function spawnCommand (entry, args = [], extraEnv = {}) {
  return spawn(entry, args, {
    cwd: guiDir,
    env: { ...process.env, ...extraEnv },
    shell: false,
    stdio: 'inherit',
    windowsHide: false,
  })
}

function resolveVueCliServiceBin () {
  return require.resolve('@vue/cli-service/bin/vue-cli-service.js', {
    paths: [guiDir],
  })
}

function readElectronVersion (distDir) {
  try {
    return fs.readFileSync(path.join(distDir, 'version'), 'utf8').trim()
  } catch {
    return ''
  }
}

// 根因：DSH 的工作区沙箱给目录打了 Low 完整性标签（继承给所有文件），
// Windows 会用 Low 令牌创建进程；Low 进程调用 CreateWindowStation 创建
// Chromium 沙箱需要的备用窗口站会失败，Sandbox::Initialize 里的 CHECK 随即
// 以 0xC000001D 终止进程。把 dist 的标签改成 Medium 就能正常启用沙箱，
// 不需要 --no-sandbox。把 icacls 失败时的缓存副本保留为兜底。
function ensureMediumIntegrity (distDir) {
  try {
    const result = spawnSync(
      'icacls',
      [distDir, '/setintegritylevel', '(OI)(CI)Medium', '/T', '/C', '/Q'],
      { windowsHide: true, encoding: 'utf8' },
    )
    return result.status === 0
  } catch {
    return false
  }
}

function prepareCachedCopy (distDir) {
  const cachedDir = path.join(DEV_ELECTRON_CACHE, readElectronVersion(distDir) || 'unknown')
  const cachedBin = path.join(cachedDir, path.basename(guiRequire('electron')))
  if (!fs.existsSync(cachedBin)) {
    console.log(`[electron-dev] 无法修改完整性标签，改为把 Electron 复制到仓库外 ${cachedDir}（约 200 MB，仅一次）`)
    fs.rmSync(cachedDir, { recursive: true, force: true })
    fs.mkdirSync(cachedDir, { recursive: true })
    fs.cpSync(distDir, cachedDir, { recursive: true })
  }
  return cachedBin
}

function resolveElectronBin () {
  const bin = guiRequire('electron')
  if (process.platform !== 'win32') {
    return bin
  }
  if (process.env.DEV_SIDECAR_ELECTRON_BIN) {
    return process.env.DEV_SIDECAR_ELECTRON_BIN
  }
  const distDir = path.dirname(bin)
  const insideRepo = distDir === repoRoot || distDir.startsWith(repoRoot + path.sep)
  if (!insideRepo) {
    return bin
  }
  return ensureMediumIntegrity(distDir) ? bin : prepareCachedCopy(distDir)
}

// 受限环境（如 DSH 沙箱）下由 dev.js 通过该变量透传额外启动参数，例如
// --no-sandbox / --user-data-dir=<工作区内目录>
function resolveElectronArgs () {
  return (process.env.DEV_SIDECAR_ELECTRON_ARGS || '')
    .split(/\s+/)
    .filter(Boolean)
}

async function waitForServer (url, child) {
  const timeoutAt = Date.now() + 120000

  while (Date.now() < timeoutAt) {
    if (child.exitCode != null || child.signalCode != null) {
      throw new Error('Dev server exited before it became ready')
    }

    try {
      const response = await fetch(url, { method: 'GET' })
      if (response.ok || response.status >= 200) {
        return
      }
    } catch {
      // Keep polling until the dev server is reachable.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function stopChild (child) {
  if (!child || child.exitCode != null || child.signalCode != null) {
    return
  }

  child.kill('SIGTERM')
}

async function shutdown (code = 0) {
  if (state.closing) {
    return
  }

  state.closing = true
  stopChild(state.electron)
  stopChild(state.devServer)
  process.exitCode = code
}

process.on('SIGINT', () => {
  void shutdown(0)
})
process.on('SIGTERM', () => {
  void shutdown(0)
})

async function main () {
  const vueCliServiceBin = resolveVueCliServiceBin()
  const electronBin = resolveElectronBin()

  state.devServer = spawnCommand(process.execPath, [vueCliServiceBin, 'serve', '--port', String(devServerPort)])
  state.devServer.on('exit', (code, signal) => {
    if (!state.closing) {
      console.error(`[electron-dev] 开发服务器已退出（${signal ? `signal ${signal}` : `code ${code}`}），请检查 ${devServerPort} 端口是否被占用`)
      void shutdown(code ?? (signal ? 1 : 0))
    }
  })

  try {
    await waitForServer(devServerUrl, state.devServer)
    state.electron = spawnCommand(electronBin, ['.', ...resolveElectronArgs()], {
      WEBPACK_DEV_SERVER_URL: devServerUrl,
    })
    state.electron.on('exit', (code, signal) => {
      if (!state.closing) {
        console.error(`[electron-dev] Electron 已退出（${signal ? `signal ${signal}` : `code ${code}`}）`)
        if (SANDBOX_CRASH_CODES.has(code)) {
          console.error('[electron-dev] 该退出码是 Chromium 沙箱初始化失败。可先设置 DEV_SIDECAR_ELECTRON_ARGS=--no-sandbox 再重试')
        }
      }
      void shutdown(code ?? (signal ? 1 : 0))
    })
  } catch (error) {
    console.error(error)
    await shutdown(1)
  }
}

void main()
