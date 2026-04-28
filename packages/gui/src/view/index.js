import modules from '../bridge/front'
import { apiInit, useApi } from './api'
import status from './status'

export default {
  initApi: apiInit,
  async initPre (app, api) {
    app.config.globalProperties.$api = api
    const setting = await api.setting.load()
    app.config.globalProperties.$global = {
      setting,
      config: await api.config.get(),
    }
    await status.install(app, api)
  },
  initModules (app, router) {
    const api = useApi()
    modules.install(app, api, router)
  },
}
