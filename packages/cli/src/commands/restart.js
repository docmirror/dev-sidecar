const fs = require('node:fs')
const { PID_FILE } = require('./start')

function isAlive (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 等守护进程真正退出。判据同时看进程与 core 的实例锁：start 拒绝启动就是因为锁没释放，
 * 只看进程、只看固定 5 秒都不够（实测关闭常超过 5 秒，于是 restart 把服务弄停）。
 */
async function waitForExit (pid, timeoutMs = 30000) {
  const { api } = require('@blue-frontier/dev-sidecar')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    let locked = false
    try {
      locked = await api.instance.isLocked()
    } catch {}
    if (!isAlive(pid) && !locked) return true
    await sleep(300)
  }
  return false
}

async function restartDaemon () {
  const { startDaemon } = require('./start')

  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10)
    if (isAlive(pid)) {
      console.log(`正在停止 dev-sidecar (PID: ${pid})...`)
      process.kill(pid, 'SIGINT')
      if (!await waitForExit(pid)) {
        console.error('旧进程在 30 秒内没有退出、实例锁仍被占用，已放弃重启以免留下停不下来的状态')
        process.exit(1)
      }
      console.log('旧进程已退出')
    }
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
  }

  await startDaemon()
}

module.exports = { restartDaemon }
