const path = require('node:path')
const log = require('../../../utils/util.log')

function getExtraPath () {
  let extraPath = process.env.DS_EXTRA_PATH
  log.info('extraPath:', extraPath)
  if (!extraPath) {
    extraPath = __dirname
  }
  return extraPath
}

function getProxyExePath () {
  const extraPath = getExtraPath()
  return path.join(extraPath, 'sysproxy.exe')
}

function getEnableLoopbackPath () {
  const extraPath = getExtraPath()
  return path.join(extraPath, 'EnableLoopback.exe')
}

module.exports = {
  getProxyExePath,
  getEnableLoopbackPath,
}
