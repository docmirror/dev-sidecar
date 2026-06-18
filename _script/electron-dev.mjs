import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

const guiDir = process.cwd()
const require = createRequire(import.meta.url)

const devServerUrl = 'http://localhost:8080'
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

function resolveElectronBin () {
  return require('electron')
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

  state.devServer = spawnCommand(process.execPath, [vueCliServiceBin, 'serve', '--port', '8080'])
  state.devServer.on('exit', (code, signal) => {
    if (!state.closing) {
      void shutdown(code ?? (signal ? 1 : 0))
    }
  })

  try {
    await waitForServer(devServerUrl, state.devServer)
    state.electron = spawnCommand(electronBin, ['.'], {
      WEBPACK_DEV_SERVER_URL: devServerUrl,
    })
    state.electron.on('exit', (code, signal) => {
      void shutdown(code ?? (signal ? 1 : 0))
    })
  } catch (error) {
    console.error(error)
    await shutdown(1)
  }
}

void main()
