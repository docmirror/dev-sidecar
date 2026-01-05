const fs = require('node:fs')
const path = require('node:path')
const server = require('@docmirror/mitmproxy')
const jsonApi = require('@docmirror/mitmproxy/src/json.js')
const log = require('@docmirror/mitmproxy/src/utils/util.log.server.js') // 当前脚本是在 server 的进程中执行的，所以使用 mitmproxy 中的logger

const home = process.env.USER_HOME || process.env.HOME || 'C:/Users/Administrator/'

let configPath
if (process.argv && process.argv.length > 3) {
  configPath = process.argv[2]
} else {
  configPath = path.join(home, '.dev-sidecar/running.json')
}

const configJson = fs.readFileSync(configPath)
log.info('读取 running.json by cli 成功:', configPath)
let config
try {
  config = jsonApi.parse(configJson.toString())
} catch (e) {
  log.error(`running.json 文件内容格式不正确，文件路径：${configPath}，文件内容: ${configJson.toString()}, error:`, e)
  config = {}
}
// const scriptDir = '../../gui/extra/scripts/'
// config.setting.script.defaultDir = path.join(__dirname, scriptDir)
// const pacFilePath = '../../gui/extra/pac/pac.txt'
// config.plugin.overwall.pac.customPacFilePath = path.join(__dirname, pacFilePath)
config.setting.rootDir = path.join(__dirname, '../../gui/')
log.info(`start mitmproxy by cli, configPath: ${configPath}`)
server.start(config)
