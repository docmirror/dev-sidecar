// import api from './api/front'
import error from './error/front'
import tongji from './tongji/front'
import update from './update/front'
import fileSelector from './file-selector/front'

const modules = {
  // api, // 核心接口模块
  error,
  fileSelector, // 文件选择模块
  tongji, // 统计模块
  update // 自动更新
}
export default {
  install (app, api, router) {
    for (const module in modules) {
      modules[module].install(app, api, router)
    }
  },
  ...modules
}
