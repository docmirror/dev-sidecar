// eslint-disable-next-line no-unused-vars
const server = require('@docmirror/mitmproxy')
const config = JSON.parse(process.argv[2])
const path = require('path')
const scriptDir = '../../gui/extra/scripts/'
config.setting.script.defaultDir = path.join(__dirname, scriptDir)
server.start(config)
