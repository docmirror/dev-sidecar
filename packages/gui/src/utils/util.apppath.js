import path from 'path'
const isDevelopment = process.env.NODE_ENV !== 'production'
export default {
  getAppRootPath (app) {
    if (isDevelopment) {
      return app.getAppPath()
    } else {
      return path.join(app.getAppPath(), '../../')
    }
  }
}
