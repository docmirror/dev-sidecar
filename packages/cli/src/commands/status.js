const fs = require('node:fs')
const path = require('node:path')

function getUserBase () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
}

function getStatusFile () {
  return path.join(getUserBase(), 'status.json')
}

function getPidFile () {
  return path.join(getUserBase(), 'ds-cli.pid')
}

function isAlive (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
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

  const pluginNames = ['git', 'node', 'pip', 'overwall', 'free_eye']
  for (const name of pluginNames) {
    const enabled = status.plugin?.[name]?.enabled || false
    const label = name === 'free_eye' ? 'free_eye' : name.padEnd(8)
    console.log(`    ${label} ${enabled ? '已启用' : '未启用'}`)
  }
}

function showStatus () {
  const statusFile = getStatusFile()
  const pidFile = getPidFile()

  if (!fs.existsSync(statusFile)) {
    let autoStart = '未知'
    try {
      const { isInstalled } = require('./service')
      autoStart = isInstalled() ? '已注册' : '未注册'
    } catch {}

    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10)
      if (isAlive(pid)) {
        console.log(`dev-sidecar 正在运行 (PID: ${pid})，但 status.json 尚未生成，请稍后重试`)
      } else {
        console.log('dev-sidecar 未在运行（PID 文件存在但进程已退出）')
        fs.unlinkSync(pidFile)
      }
    } else {
      console.log('dev-sidecar 未在运行')
    }
    console.log(`  开机启动:  ${autoStart}`)
    return
  }

  try {
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
    printStatus(status)
  } catch (e) {
    console.error('读取状态文件失败:', e.message)
  }
}

module.exports = { showStatus }
