const fs = require('node:fs')
const path = require('node:path')

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
}

function getRunningJsonPath () {
  return path.join(getUserBase(), 'running.json')
}

function isAlive (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// 插件列表：free_eye 是一次性插件，无持久化状态，不显示；
// overwall 仅解锁后（setting.json 中 overwall === true）才显示
function getPluginNames () {
  const names = ['git', 'node', 'pip']
  try {
    const { isOverwallUnlocked } = require('./plugin')
    if (isOverwallUnlocked()) {
      names.push('overwall')
    }
  } catch {}
  return names
}

function printStatus (status) {
  const serverRunning = status.server?.enabled || false
  const proxyEnabled = status.proxy?.enabled || false

  let autoStart = '未知'
  try {
    const { isInstalled } = require('./service')
    autoStart = isInstalled() ? '已注册' : '未注册'
  } catch {}

  // 读取 running.json 中的实例信息
  let instanceInfo = ''
  try {
    const DevSidecar = require('@docmirror/dev-sidecar')
    const instance = DevSidecar.api.instance.readInstance()
    if (instance) {
      instanceInfo = `  运行实例:  ${instance.type === 'gui' ? 'GUI' : 'CLI'}${instance.pid ? ` (PID: ${instance.pid})` : ''}${instance.startTime ? `，启动于 ${instance.startTime}` : ''}`
    }
  } catch {}

  console.log('dev-sidecar 运行状态:')
  console.log(`  代理服务:  ${serverRunning ? '运行中' : '未运行'}`)
  console.log(`  系统代理:  ${proxyEnabled ? '已开启' : '未开启'}`)
  console.log(`  开机启动:  ${autoStart}`)
  if (instanceInfo) {
    console.log(instanceInfo)
  }
  console.log('  插件:')

  for (const name of getPluginNames()) {
    const enabled = status.plugin?.[name]?.enabled || false
    const label = name.padEnd(8)
    console.log(`    ${label} ${enabled ? '已启用' : '未启用'}`)
  }
}

async function showStatus () {
  // 锁新鲜 = 有实例在运行（GUI 或 CLI），替代 status.json/PID 文件判断
  const DevSidecar = require('@docmirror/dev-sidecar')
  const running = await DevSidecar.api.instance.isLocked()

  let autoStart = '未知'
  try {
    const { isInstalled } = require('./service')
    autoStart = isInstalled() ? '已注册' : '未注册'
  } catch {}

  if (!running) {
    console.log('dev-sidecar 未在运行')
    console.log(`  开机启动:  ${autoStart}`)
    return
  }

  // 读取 running.json 中的运行时状态（由状态事件驱动写入）
  let status = {}
  try {
    const data = JSON.parse(fs.readFileSync(getRunningJsonPath(), 'utf-8'))
    status = data?.app?.status || {}
  } catch {}

  printStatus(status)
}

module.exports = { showStatus, getPluginNames }
