const fs = require('node:fs')
const path = require('node:path')
const DevSidecar = require('@docmirror/dev-sidecar')

DevSidecar.api.config.reload()

const action = process.argv[2]
const userBase = path.join(process.env.USERPROFILE || process.env.HOME || '/', '.dev-sidecar')
const STATUS_FILE = path.join(userBase, 'status.json')

function updateStatus (proxyEnabled) {
  try {
    // 读取现有状态
    let status = { server: { enabled: true }, proxy: { enabled: false }, plugin: {} }
    if (fs.existsSync(STATUS_FILE)) {
      status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'))
    }
    // 更新代理状态
    status.proxy = { enabled: proxyEnabled }
    // 写入状态文件
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2))
  } catch {}
}

async function run () {
  if (action === 'on') {
    await DevSidecar.api.proxy.start()
    updateStatus(true)
    console.log('系统代理已开启')
  } else if (action === 'off') {
    await DevSidecar.api.proxy.close()
    updateStatus(false)
    console.log('系统代理已关闭')
  }
}

run().catch((e) => {
  console.error(`操作失败:`, e.message)
  process.exit(1)
})
