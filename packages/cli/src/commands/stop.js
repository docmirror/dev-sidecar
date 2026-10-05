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
 * 停止守护进程。
 * 返回 Promise：只有确认进程真的退出（或本来就已不在）才返回 true。
 * 之前是 5 秒后不管结果如何都打印「已停止」并删掉 pid 文件，会把「没停掉」说成「停掉了」，
 * 进而让 restart 在实例锁仍被占用时去启动，最终把服务弄停。
 */
async function stopDaemon () {
  if (!fs.existsSync(PID_FILE)) {
    console.log('dev-sidecar 未在运行')
    return true
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10)
  if (!isAlive(pid)) {
    console.log('dev-sidecar 进程已不存在，清理 PID 文件')
    fs.unlinkSync(PID_FILE)
    return true
  }

  process.kill(pid, 'SIGINT')
  console.log(`已发送停止信号到 PID: ${pid}`)

  for (let waited = 0; waited < 15000; waited += 300) {
    await sleep(300)
    if (!isAlive(pid)) {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
      console.log('dev-sidecar 已停止')
      // 进程虽已退出，实例锁（proper-lockfile）还要等到过期判定（10 秒）才失效。
      // 不等它，紧接着执行的 start 会被误判为「已在运行中」而拒绝。
      const { api } = require('@blue-frontier/dev-sidecar')
      for (let waited2 = 0; waited2 < 15000; waited2 += 500) {
        let locked = false
        try {
          locked = await api.instance.isLocked()
        } catch {}
        if (!locked) return true
        await sleep(500)
      }
      console.warn('实例锁仍未释放；紧接着执行 start 可能被拒绝，通常再等几秒即可')
      return true
    }
  }

  console.error(`PID ${pid} 在 15 秒内仍未退出，实例锁可能仍被占用`)
  return false
}

module.exports = { stopDaemon }
