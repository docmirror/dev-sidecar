import os from 'node:os'
import path from 'node:path'
import log from './util.log.gui'

function getSystemPlatform (throwIfUnknown = false) {
  switch (os.platform()) {
    case 'darwin':
      return 'mac'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    case 'win64':
      return 'windows'
    default:
      log.error(`UNKNOWN OS TYPE: ${os.platform()}`)
      if (throwIfUnknown) {
        throw new Error(`UNKNOWN OS TYPE ${os.platform()}`)
      } else {
        return 'unknown-os'
      }
  }
}

export default {
  getAppRootPath (app) {
    const exePath = app.getPath('exe')
    if (getSystemPlatform() === 'mac') {
      return path.join(exePath, '../../')
    }
    return path.join(exePath, '../')
  },
}
