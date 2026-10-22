import api from './api/backend.js'
import autoStart from './auto-start/backend.js'
import diagnostics from './diagnostics/backend.js'
import feedback from './feedback/backend.js'
import fileSelector from './file-selector/backend.js'
import tongji from './tongji/backend.js'
import update from './update/backend.js'
import log from '../utils/util.log.gui.js'

const modules = {
  api, // 核心接口模块
  fileSelector, // 文件选择模块
  tongji, // 统计模块
  update, // 自动更新
  autoStart,
  diagnostics, // 网页诊断
  feedback, // 反馈：打包日志并打开 issue
}
export default {
  install (context) {
    for (const module in modules) {
      log.info('install module:', module)
      modules[module].install(context)
    }
  },
  ...modules,
}
