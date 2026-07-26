const DevSidecar = require('@docmirror/dev-sidecar')

DevSidecar.api.config.reload()

const action = process.argv[2]

async function run () {
  if (action === 'on') {
    await DevSidecar.api.proxy.start()
    console.log('系统代理已开启')
  } else if (action === 'off') {
    await DevSidecar.api.proxy.close()
    console.log('系统代理已关闭')
  }
}

run().catch((e) => {
  console.error(`操作失败:`, e.message)
  process.exit(1)
})
