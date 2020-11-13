let updateParams = { }
function install (app, api) {
  api.ipc.on('update', (event, message) => {
    console.log('on message', event, message)
    handleUpdateMessage(message, app)
  })

  api.update = {
    checkForUpdate (params) {
      updateParams = params || { fromUser: false, autoDownload: true, progress: 0 }
      api.ipc.send('update', { key: 'checkForUpdate' })
    },
    downloadUpdate () {
      api.ipc.send('update', { key: 'downloadUpdate' })
    },
    doUpdateNow () {
      api.ipc.send('update', { key: 'doUpdateNow' })
    }
  }

  function handleUpdateMessage (message) {
    const type = message.key
    if (type === 'available') {
      foundNewVersion(message.value)
    } else if (type === 'notAvailable') {
      noNewVersion()
    } else if (type === 'downloaded') {
      // 更新包已下载完成，让用户确认是否更新
      newUpdateIsReady(message.value)
    } else if (type === 'progress') {
      progressUpdate(message.value)
    } else if (type === 'error') {
      const error = message.error
      app.$message.error('Error: ' + (error == null ? '未知错误' : (error.stack || error).toString()))
    }
  }

  function noNewVersion (value) {
    updateParams.newVersion = false
    if (updateParams.fromUser) {
      app.$message.info('当前已经是最新版本')
    }
  }

  function progressUpdate (value) {
    updateParams.progress = value
  }
  function foundNewVersion (value) {
    updateParams.newVersion = true

    if (updateParams.autoDownload !== false) {
      api.update.downloadUpdate()
      return
    }
    app.$confirm({
      title: '发现新版本',
      content: `是否要更新到v${value.version}?`,
      cancelText: '暂不升级',
      okText: '升级',
      // content: h => <div><h4>{value.version}更新内容：</h4><div>{value.releaseNotes}</div></div>,
      onOk () {
        console.log('OK')
        api.update.downloadUpdate()
      },
      onCancel () {
        console.log('Cancel')
      }
    })
  }

  function newUpdateIsReady (value) {
    app.$confirm({
      title: '新版本已准备好',
      content: `是否立即升级安装v${value.version}?`,
      cancelText: '暂不升级',
      okText: '立即升级',
      // content: h => <div><h4>{value.version}更新内容：</h4><div>{value.releaseNotes}</div></div>,
      onOk () {
        console.log('OK')
        api.update.doUpdateNow()
      },
      onCancel () {
        console.log('Cancel')
      }
    })
  }
}

export default {
  install
}
