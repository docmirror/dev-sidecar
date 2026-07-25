const DevSidecar = require('@docmirror/dev-sidecar')

const action = process.argv[2]
const name = process.argv[3]

DevSidecar.api.config.reload()

async function run () {
  if (action === 'start') {
    await DevSidecar.api.plugin[name].start()
    console.log(`插件 ${name} 已启动`)
  } else if (action === 'stop') {
    await DevSidecar.api.plugin[name].close()
    console.log(`插件 ${name} 已停止`)
  }
}

run().catch((e) => {
  console.error(`操作失败:`, e.message)
  process.exit(1)
})
