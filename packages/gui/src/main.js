import Vue from 'vue'
import App from './view/components/App.vue'
import antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import view from './view'
import { apiInit } from './view/api'
Vue.config.productionTip = false
Vue.use(antd)

apiInit().then(() => {
  const app = new Vue({
    render: h => h(App)
  }).$mount('#app')

  view.register(app)
})
