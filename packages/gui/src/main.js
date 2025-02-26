import antd from 'ant-design-vue'
import Vue from 'vue'
import VueRouter from 'vue-router'
import SearchBar from 'search-bar-vue2'
import { ipcRenderer } from 'electron'
import view from './view'
import App from './view/App.vue'
import DsContainer from './view/components/container'
import routes from './view/router'
import 'ant-design-vue/dist/antd.css'
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

  Vue.config.productionTip = false
  Vue.use(antd)
  Vue.use(VueRouter)
  Vue.use(SearchBar)
  Vue.component(DsContainer)
  // 3. 创建 router 实例，然后传 `routes` 配置
  // 你还可以传别的配置参数, 不过先这么简单着吧。
  const router = new VueRouter({
    routes, // (缩写) 相当于 routes: routes
  })
  const app = new Vue({
    router,
    render: h => h(App),
  })
  view.initApi(app).then(async (api) => {
    // 初始化status
    try {
      await view.initPre(Vue, api)
      app.$mount('#app')
      view.initModules(app, router)
    } catch (e) {
      console.error('view初始化出现未知异常：', e)
      ipcRenderer.send('view初始化出现未知异常：', e)
    }
  })

  // fix vue-router NavigationDuplicated
  const VueRouterPush = VueRouter.prototype.push
  VueRouter.prototype.push = function push (location) {
    return VueRouterPush.call(this, location).catch(err => err)
  }
  const VueRouterReplace = VueRouter.prototype.replace
  VueRouter.prototype.replace = function replace (location) {
    return VueRouterReplace.call(this, location).catch(err => err)
  }

  console.info('main.js finished')
  ipcRenderer.send('main.js finished')
} catch (e) {
  console.error('页面加载出现未知异常：', e)
  ipcRenderer.send('[ERROR] 页面加载出现未知异常：', e)
}
