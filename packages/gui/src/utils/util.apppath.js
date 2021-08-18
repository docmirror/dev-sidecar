import path from 'path'
export default {
  getAppRootPath (app) {
    const exePath = app.getPath('exe')
    return path.join(exePath, '../')
  }
}
