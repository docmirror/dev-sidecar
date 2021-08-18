import path from 'path'
import os from 'os'
function getSystemPlatform () {
  switch (os.platform()) {
    case 'darwin':
      return 'mac'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    case 'win64':
      return 'windows'
    case 'unknown os':
    default:
      throw new Error(`UNKNOWN OS TYPE ${os.platform()}`)
  }
}
export default {
  getAppRootPath (app) {
    const exePath = app.getPath('exe')
    if (getSystemPlatform() === 'mac') {
      return path.join(exePath, '../../')
    }
    return path.join(exePath, '../')
  }
}
