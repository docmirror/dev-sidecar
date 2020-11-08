import api from './api'
import status from './status'
import lodash from 'lodash'
function register (app) {
  api.on('status', (event, message) => {
    console.log('view on status', event, message)
    const value = message.value
    const key = message.key
    lodash.set(status, key, value)
  })

  api.on('error.core', (event, message) => {
    console.error('view on error', message)
    const key = message.key
    if (key === 'server') {
      handleServerStartError(message.error, app)
    }
  })
  api.on('error', (event, message) => {
    console.error('error', event, message)
  })
}

function handleServerStartError (err, app) {
  if (err.message && err.message.indexOf('listen EADDRINUSE') >= 0) {
    app.$confirm({
      title: '端口被占用，代理服务启动失败',
      content: '是否要杀掉占用进程？',
      onOk () {
        // TODO 杀掉进程
        api.config.get().then(config => {
          console.log('config', config)
          api.shell.killByPort({ port: config.server.port }).then(ret => {
            app.$message.info('杀掉进程成功，请重试开启代理服务')
          })
        })
      },
      onCancel () {
        console.log('Cancel')
      }
    })
  }
}

export default register
