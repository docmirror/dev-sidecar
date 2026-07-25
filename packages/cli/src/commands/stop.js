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

function stopDaemon () {
  if (!fs.existsSync(PID_FILE)) {
    console.log('dev-sidecar 未在运行')
    return
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10)
  if (!isAlive(pid)) {
    console.log('dev-sidecar 进程已不存在，清理 PID 文件')
    fs.unlinkSync(PID_FILE)
    return
  }

  process.kill(pid, 'SIGINT')
  console.log(`已发送停止信号到 PID: ${pid}`)

  let waited = 0
  const interval = setInterval(() => {
    if (!isAlive(pid) || waited >= 5000) {
      clearInterval(interval)
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE)
      console.log('dev-sidecar 已停止')
      return
    }
    waited += 200
  }, 200)
}

module.exports = { stopDaemon }
