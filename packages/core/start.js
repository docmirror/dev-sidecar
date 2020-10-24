const DevSidercar = require('.')
require('json5/lib/register')
const config = require('../../config/index.json5')
// 启动服务
DevSidercar.api.startup(config)
async function onClose () {
  console.log('on sigint ')
  await DevSidercar.api.shutdown()
  console.log('on closed ')
  process.exit(0)
}
process.on('SIGINT', onClose)
