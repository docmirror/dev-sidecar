// eslint-disable-next-line no-unused-vars
const server = require('@docmirror/mitmproxy')
const JSON5 = require('json5')
const path = require('path')
const home = process.env.USER_HOME || process.env.HOME || 'C:/Users/Administrator/'
let configPath = path.join(home, '.dev-sidecar/running.json')
if (process.argv && process.argv.length > 3) {
  configPath = process.argv[2]
}

const fs = require('fs')
const configJson = fs.readFileSync(configPath)
const config = JSON5.parse(configJson)
// const scriptDir = '../../gui/extra/scripts/'
// config.setting.script.defaultDir = path.join(__dirname, scriptDir)
// const pacFilePath = '../../gui/extra/pac/pac.txt'
// config.plugin.overwall.pac.customPacFilePath = path.join(__dirname, pacFilePath)
config.setting.rootDir = path.join(__dirname, '../../gui/')
server.start(config)
