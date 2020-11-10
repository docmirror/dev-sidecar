import update from './update'
import error from './error'

export default {
  install (app, api) {
    error.install(app, api)
    update.install(app, api)
  }
}
