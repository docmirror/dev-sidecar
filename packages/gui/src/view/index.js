import api, { apiInit } from './api'
import modules from './modules'
import status from './status'
export default {
  initApi: apiInit,
  async initPre (api) {
    await status.install(api)
  },
  initModules (app) {
    modules.install(app, api)
  }
}
