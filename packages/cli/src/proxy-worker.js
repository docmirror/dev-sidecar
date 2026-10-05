const DevSidecar = require('@blue-frontier/dev-sidecar')

DevSidecar.api.config.reload()

// 参数来源：SEA 下由入口扫描 argv 写入环境变量；非 SEA 的 fork 路径仍然走 argv
const action = process.env.DS_WORKER_ACTION || process.argv[2]

/** 更新运行状态；子进程没有 IPC 通道时 process.send 会抛 Channel closed，不应影响代理本身 */
function safeUpdateStatus (key, value) {
  try {
    DevSidecar.api.instance.updateStatus(key, value)
  } catch (e) {
    console.warn(`更新状态 ${key} 失败（可忽略）：${e.message}`)
  }
}

async function run () {
  if (action === 'on') {
    await DevSidecar.api.proxy.start()
    safeUpdateStatus('proxy.enabled', true)
    console.log('系统代理已开启')
  } else if (action === 'off') {
    await DevSidecar.api.proxy.close()
    safeUpdateStatus('proxy.enabled', false)
    console.log('系统代理已关闭')
  } else if (action === 'loopback') {
    // 先确认 helper 随包提供：缺失时明确报错，而不是像原生模块那样静默失败
    const fs = require('node:fs')
    const loopbackPath = DevSidecar.api.shell.extraPath.getEnableLoopbackPath()
    if (!fs.existsSync(loopbackPath)) {
      console.error(`找不到 EnableLoopback.exe：${loopbackPath}`)
      console.error('该文件需要与 ds-cli 可执行文件放在同一目录（官方发布包内已附带）。')
      process.exit(1)
    }
    console.log(`正在请求管理员权限以运行 ${loopbackPath} ...`)
    await DevSidecar.api.proxy.setEnableLoopback()
    console.log('回环豁免已执行：Windows 应用现在可以访问本地代理')
  }
}

run().catch((e) => {
  console.error(`操作失败:`, e.message)
  process.exit(1)
})
