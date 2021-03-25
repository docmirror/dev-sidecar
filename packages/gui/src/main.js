import Vue from 'vue'
import App from './view/App.vue'
import antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import view from './view'
import VueRouter from 'vue-router'
import routes from './view/router'
import DsContainer from './view/components/container'
import './view/style/index.scss'

Vue.config.productionTip = false
Vue.use(antd)
Vue.use(VueRouter)
Vue.component(DsContainer)
// 3. 创建 router 实例，然后传 `routes` 配置
// 你还可以传别的配置参数, 不过先这么简单着吧。
const router = new VueRouter({
  routes // (缩写) 相当于 routes: routes
})
const app = new Vue({
  router,
  render: h => h(App)
})
view.initApi(app).then(async (api) => {
  // 初始化status
  await view.initPre(Vue, api)
  app.$mount('#app')
  view.initModules(app, router)
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
