const DevSidercar = require('.')
const fs = require('fs')
// require('json5/lib/register')
// const config = require('../../config/index.json5')
// 启动服务
const mitmproxyPath = './mitmproxy'
async function startup () {
  const banner = fs.readFileSync('./banner.txt')
  console.log(banner.toString())
  await DevSidercar.api.startup({ mitmproxyPath })
  console.log('dev-sidecar 已启动')
}

async function onClose () {
  console.log('on sigint ')
  await DevSidercar.api.shutdown()
  console.log('on closed ')
  process.exit(0)
}
process.on('SIGINT', onClose)

startup()
