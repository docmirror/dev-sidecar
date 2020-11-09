const JSON5 = require('json5')
const DevSidecar = require('../index')
const fs = require('fs')
// 启动服务
const mitmproxyPath = './start/mitmproxy'
async function startup () {
  const banner = fs.readFileSync('./start/banner.txt')
  console.log(banner.toString())

  const configPath = './start/user_config.json5'
  if (fs.existsSync(configPath)) {
    const file = fs.readFileSync(configPath)
    const userConfig = JSON5.parse(file.toString())
    DevSidecar.api.config.set(userConfig)
  }

  await DevSidecar.api.startup({ mitmproxyPath })
  console.log('dev-sidecar 已启动')
}

async function onClose () {
  console.log('on sigint ')
  await DevSidecar.api.shutdown()
  console.log('on closed ')
  process.exit(0)
}
process.on('SIGINT', onClose)

startup()
