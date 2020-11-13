import lodash from 'lodash'
import Vue from 'vue'
const status = {
  server: {
    enabled: false
  },
  proxy: {
    enabled: false
  },
  plugin: {
    node: {}
  }
}
async function install (api) {
  api.ipc.on('status', (event, message) => {
    console.log('view on status', event, message)
    const value = message.value
    const key = message.key
    lodash.set(status, key, value)
  })
  const basicStatus = await api.status.get()
  lodash.merge(status, basicStatus)
  Vue.prototype.$status = status
  return status
}
export default {
  install,
  status
}
