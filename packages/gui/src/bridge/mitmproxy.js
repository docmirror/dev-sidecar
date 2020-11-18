// eslint-disable-next-line no-unused-vars
const server = require('@docmirror/mitmproxy')
const config = JSON.parse(process.argv[2])
const path = require('path')
const log = require('../utils/util.log')
let scriptDir = '../extra/scripts/'
if (process.env.NODE_ENV === 'development') {
  scriptDir = '../extra/scripts/'
}
config.setting.scriptDir = path.join(__dirname, scriptDir)
log.debug('scriptDir', config.setting.scriptDir)
server.start(config)
