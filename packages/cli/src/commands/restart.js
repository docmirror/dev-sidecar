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

async function restartDaemon () {
  const { startDaemon } = require('./start')

  // 先停止
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10)
    if (isAlive(pid)) {
      console.log(`正在停止 dev-sidecar (PID: ${pid})...`)
      process.kill(pid, 'SIGINT')

      // 等待进程退出（最多 5 秒）
      for (let i = 0; i < 50; i++) {
        if (!isAlive(pid)) break
        await sleep(100)
      }

      // 清理残留的 PID 文件
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
    }
  }

  // 再启动
  await startDaemon()
}

module.exports = { restartDaemon }
