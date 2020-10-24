import Vue from 'vue'
import App from './view/components/App.vue'
import antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import './view'
Vue.config.productionTip = false
Vue.use(antd)

new Vue({
  render: h => h(App)
}).$mount('#app')
