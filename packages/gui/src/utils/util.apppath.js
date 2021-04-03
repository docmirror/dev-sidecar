import path from 'path'
// const isDevelopment = process.env.NODE_ENV !== 'production'
export default {
  getAppRootPath () {
    // if (isDevelopment) {
    //   return app.getAppPath()
    // } else {
    //   return path.join(app.getAppPath(), '../../')
    // }

    return path.resolve('.')
  }
}
