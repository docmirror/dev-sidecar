const { fork } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const jsonApi = require('@docmirror/mitmproxy/src/json')

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
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

function getValidPlugins () {
  return Object.keys(require('@docmirror/dev-sidecar/src/modules/plugin'))
}

function getSettingsPath () {
  const userBase = process.env.USERPROFILE || process.env.HOME || '/'
  const dir = path.join(userBase, '.dev-sidecar')
  const newPath = path.join(dir, 'setting.json')
  const oldPath = path.join(dir, 'setting.json5')
  if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) return oldPath
  return newPath
}

function isOverwallUnlocked () {
  const settingPath = getSettingsPath()
  if (!fs.existsSync(settingPath)) return false
  try {
    const setting = jsonApi.parse(fs.readFileSync(settingPath, 'utf-8'))
    return setting?.overwall === true
  } catch {
    return false
  }
}

function handlePlugin (action, name) {
  let validPlugins = getValidPlugins()

  if (!isOverwallUnlocked()) {
    validPlugins = validPlugins.filter(p => p !== 'overwall')
  }

  if (!action || !name) {
    console.error('用法: ds-cli plugin <start|stop> <name>')
    console.error(`可用插件: ${validPlugins.join(', ')}`)
    process.exit(1)
  }

  if (!['start', 'stop'].includes(action)) {
    console.error(`无效操作: ${action}，可用: start, stop`)
    process.exit(1)
  }

  if (!validPlugins.includes(name)) {
    console.error(`无效插件: ${name}，可用: ${validPlugins.join(', ')}`)
    process.exit(1)
  }

  // free_eye 是一次性测试功能，直接 fork 执行
  if (name === 'free_eye') {
    if (action === 'stop') {
      console.log('free_eye 是一次性测试功能，stop 命令不适用')
      return
    }
    const workerPath = path.join(__dirname, '../free-eye-worker.js')
    const child = fork(workerPath)
    child.on('exit', (code) => {
      process.exit(code || 0)
    })
    return
  }

  // 持久化到 config.json（重启后生效）
  const config = readConfig()
  config.plugin = config.plugin || {}
  config.plugin[name] = config.plugin[name] || {}
  config.plugin[name].enabled = action === 'start'
  writeConfig(config)
  console.log(`已${action === 'start' ? '启用' : '禁用'}插件 ${name}（重启后生效）`)

  // 如果守护进程正在运行，尝试重启使其立即生效
  const pidFile = path.join(getUserBase(), 'ds-cli.pid')
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10)
      process.kill(pid, 'SIGINT')
      console.log('正在重启守护进程...')
    } catch {}
  }
}

module.exports = { handlePlugin }
