const fs = require('node:fs')
const DevSidecar = require('../index')
const jsonApi = require('@docmirror/mitmproxy/src/json')

// 启动服务
const mitmproxyPath = './start/mitmproxy'
async function startup () {
  const banner = fs.readFileSync('./start/banner.txt')
  console.log(banner.toString())

  const configPath = './start/user_config.json5'
  if (fs.existsSync(configPath)) {
    const file = fs.readFileSync(configPath)
    const userConfig = jsonApi.parse(file.toString())
    console.info('读取 user_config.json5 成功:', configPath)
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
