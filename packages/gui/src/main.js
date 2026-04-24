import antd from 'ant-design-vue'
import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { ipcRenderer } from 'electron'
import view from './view'
import App from './view/App.vue'
import DsContainer from './view/components/container'
import routes from './view/router'
import 'ant-design-vue/dist/reset.css'
import './view/style/index.scss'
import './view/style/theme/dark.scss' // 暗色主题

try {
  window.onerror = (message, source, lineno, colno, error) => {
    ipcRenderer.send(`[ERROR] JavaScript脚本异常：Error in ${source} at line ${lineno}: ${message}`, error)
  }
} catch (e) {
  console.error('监听 window.onerror 出现异常:', e)
}

try {
  console.info('main.js start')
  ipcRenderer.send('main.js start')

  // 3. 创建 router 实例，然后传 `routes` 配置
  // 你还可以传别的配置参数, 不过先这么简单着吧。
  const router = createRouter({
    history: createWebHashHistory(),
    routes, // (缩写) 相当于 routes: routes
  })
  const app = createApp(App)
  
  app.use(antd)
  app.use(router)
  app.component('DsContainer', DsContainer)
  
  view.initApi(app).then(async (api) => {
    // 初始化status
    try {
      await view.initPre(app, api)
      app.mount('#app')
      view.initModules(app, router)
    } catch (e) {
      console.error('view初始化出现未知异常：', e)
      ipcRenderer.send('view初始化出现未知异常：', e)
    }
  })

  console.info('main.js finished')
  ipcRenderer.send('main.js finished')
} catch (e) {
  console.error('页面加载出现未知异常：', e)
  ipcRenderer.send('[ERROR] 页面加载出现未知异常：', e)
}
