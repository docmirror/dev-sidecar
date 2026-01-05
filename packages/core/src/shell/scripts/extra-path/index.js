import path from 'node:path';
import log from '../../../utils/util.log.core.js';

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

export default {
  getProxyExePath,
  getEnableLoopbackPath,
};
