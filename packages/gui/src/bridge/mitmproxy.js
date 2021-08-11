// eslint-disable-next-line no-unused-vars
const server = require('@docmirror/mitmproxy')
const JSON5 = require('json5').default
const configPath = process.argv[2]
const fs = require('fs')
const path = require('path')
const configJson = fs.readFileSync(configPath)
const config = JSON5.parse(configJson)
// const scriptDir = '../extra/scripts/'
// config.setting.script.defaultDir = path.join(__dirname, scriptDir)
// const pacFilePath = '../extra/pac/pac.txt'
// config.plugin.overwall.pac.customPacFilePath = path.join(__dirname, pacFilePath)
config.setting.rootDir = path.join(__dirname, '../')
server.start(config)
