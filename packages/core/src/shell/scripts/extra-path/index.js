const log = require('../../../utils/util.log')
const path = require('path')

function getExtraPath () {
  let extraPath = process.env.DS_EXTRA_PATH
  log.info('extraPath', extraPath)
  if (!extraPath) {
    extraPath = __dirname
  }
  return extraPath
}

function getProxyExePath () {
  const extraPath = getExtraPath()
  return path.join(extraPath, 'sysproxy.exe')
}

function getClearBatPath () {
  const extraPath = getExtraPath()
  return path.join(extraPath, 'clear.bat')
}

function getEnableLoopbackPath () {
  const extraPath = getExtraPath()
  return path.join(extraPath, 'EnableLoopback.exe')
}
module.exports = {
  getProxyExePath,
  getEnableLoopbackPath,
  getClearBatPath
}
