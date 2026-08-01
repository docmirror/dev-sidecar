const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')
const lockfile = require('proper-lockfile')
const event = require('../../event')

const LOCK_FILE = 'dev-sidecar.lock'
const RUNNING_JSON = 'running.json'

function getBasePath () {
  return path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
}

function getLockPath (userBasePath = getBasePath()) {
  return path.join(userBasePath, LOCK_FILE)
}

function getRunningJsonPath (userBasePath = getBasePath()) {
  return path.join(userBasePath, RUNNING_JSON)
}

function getDefaultLockOptions (log) {
  return {
    lockfilePath: getLockPath(),
    realpath: false,
    stale: 10000,
    retries: 0,
    onCompromised: (err) => {
      try {
        fs.rmdirSync(getLockPath())
      } catch {}
      if (log) {
        log.error('锁被篡改，进程退出:', err)
      }
      process.exit(1)
    },
  }
}

// 获取长锁，失败时抛错（不会无限阻塞）
async function acquireLock ({ log } = {}) {
  const release = await lockfile.lock(getLockPath(), getDefaultLockOptions(log))
  watchStatusEvents({ log })
  return release
}

// 检查锁是否被新鲜持有（非阻塞，用于启动前的友好提示）
async function isLocked () {
  try {
    return await lockfile.check(getLockPath(), { lockfilePath: getLockPath(), realpath: false, stale: 10000 })
  } catch {
    return false
  }
}

function readInstance () {
  const filePath = getRunningJsonPath()
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return data?.app?.instance || null
  } catch {
    return null
  }
}

function writeInstance (instance) {
  const filePath = getRunningJsonPath()
  let data = {}
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {}
  }
  if (!data.app) {
    data.app = {}
  }
  data.app.instance = instance
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

let statusWriteTimer = null
let statusWriteQueue = {}

// 将状态写入 running.json 的 app.status（事件驱动，300ms 防抖合并多次更新为一次写入）
function updateStatus (key, value) {
  if (typeof key !== 'string' || key.length === 0) {
    return
  }
  statusWriteQueue[key] = value
  if (statusWriteTimer) {
    return
  }
  statusWriteTimer = setTimeout(() => {
    statusWriteTimer = null
    const queue = statusWriteQueue
    statusWriteQueue = {}
    try {
      const filePath = getRunningJsonPath()
      let data = {}
      if (fs.existsSync(filePath)) {
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        } catch {}
      }
      if (!data.app) {
        data.app = {}
      }
      if (!data.app.status) {
        data.app.status = {}
      }
      for (const key in queue) {
        lodash.set(data.app.status, key, queue[key])
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch {}
  }, 300)
}

// 订阅 core 状态总线，仅同步 *.enabled 开关状态（过滤 free_eye.result 等大 payload）
function watchStatusEvents ({ log } = {}) {
  event.register('status', (e) => {
    if (!e || typeof e.key !== 'string' || !e.key.endsWith('.enabled')) {
      return
    }
    updateStatus(e.key, e.value)
  })
}

module.exports = {
  acquireLock,
  isLocked,
  readInstance,
  writeInstance,
  updateStatus,
  getLockPath,
  getRunningJsonPath,
}
