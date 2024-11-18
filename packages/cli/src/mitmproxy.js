const fs = require('node:fs')
const path = require('node:path')
const server = require('@docmirror/mitmproxy')
const jsonApi = require('@docmirror/mitmproxy/src/json')
const log = require('@docmirror/mitmproxy/src/utils/util.log')

const home = process.env.USER_HOME || process.env.HOME || 'C:/Users/Administrator/'

let configPath
if (process.argv && process.argv.length > 3) {
  configPath = process.argv[2]
} else {
  configPath = path.join(home, '.dev-sidecar/running.json')
}

const configJson = fs.readFileSync(configPath)
log.info('读取 running.json by core 成功:', configPath)
const config = jsonApi.parse(configJson.toString())
// const scriptDir = '../../gui/extra/scripts/'
// config.setting.script.defaultDir = path.join(__dirname, scriptDir)
// const pacFilePath = '../../gui/extra/pac/pac.txt'
// config.plugin.overwall.pac.customPacFilePath = path.join(__dirname, pacFilePath)
config.setting.rootDir = path.join(__dirname, '../../gui/')
log.info(`start mitmproxy config by core: 读取配置文件: ${configPath}`)
server.start(config)
