
function install (app, api) {
  api.ipc.on('auto-start', (event, message) => {
    if (message.value === true) {
      app.$message.info('已添加开机自启')
    } else {
      app.$message.info('已取消开机自启')
    }
  })
  api.autoStart = {
    async enabled (value) {
      api.ipc.send('auto-start', { key: 'enabled', value })
    }
  }
}

export default {
  install
}
