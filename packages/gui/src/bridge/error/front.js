function install (app, api) {
  api.ipc.on('error.core', (event, message) => {
    console.error('view on error', message)
    const key = message.key
    if (key === 'server') {
      handleServerStartError(message, message.error, app, api)
    }
  })
  api.ipc.on('error', (event, message) => {
    console.error('error', event, message)
  })
}

function handleServerStartError (message, err, app, api) {
  if (message.value === 'EADDRINUSE') {
    // eslint-disable-next-line no-debugger
    app.$confirm({
      title: '端口被占用，代理服务启动失败',
      content: '是否要杀掉占用进程？您也可以点击取消，然后前往加速服务->基本设置中修改代理端口',
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
  } else {
    app.$message.error('加速服务启动失败：' + message.message)
  }
}

export default {
  install
}
