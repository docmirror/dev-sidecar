const fs = require('node:fs')
const DevSidecar = require('@docmirror/dev-sidecar')
const jsonApi = require('@docmirror/mitmproxy/src/json.js')

// 启动服务
const mitmproxyPath = './mitmproxy'
async function startup () {
  const banner = fs.readFileSync('./banner.txt')
  console.log(banner.toString())

  const configPath = './user_config.json5'
  if (fs.existsSync(configPath)) {
    const file = fs.readFileSync(configPath)
    let userConfig
    try {
      userConfig = jsonApi.parse(file.toString())
      console.info(`读取和解析 user_config.json5 成功:${configPath}`)
    } catch (e) {
      console.error(`读取或解析 user_config.json5 失败: ${configPath}, error:`, e)
      userConfig = {}
    }
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
