
function install (app, api) {
  const updateParams = app.$global.update = { fromUser: false, autoDownload: false, progress: 0, downloading: false, newVersion: false, isFullUpdate: true }
  api.ipc.on('update', (event, message) => {
    console.log('on message', event, message)
    handleUpdateMessage(message, app)
  })

  api.update = {
    checkForUpdate (fromUser) {
      if (fromUser != null) {
        updateParams.fromUser = fromUser
      }
      api.ipc.send('update', { key: 'checkForUpdate' })
    },
    downloadUpdate () {
      api.ipc.send('update', { key: 'downloadUpdate' })
    },
    downloadPart (value) {
      // 增量更新
      api.ipc.send('update', { key: 'downloadPart', value })
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
      updateParams.downloading = false
      console.log('updateParams', updateParams)
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

  function downloadNewVersion (value) {
    if (value.partPackage) {
      // 有增量更新
      api.update.downloadPart(value)
    } else {
      api.shell.getSystemPlatform().then((platform) => {
        if (platform === 'mac') {
          app.$notification.open({
            duration: 15,
            message: 'Mac暂不支持全量自动升级',
            description:
              '请前往github或gitee项目release页面下载新版本手动安装',
            onClick: () => {

            }
          })
          return
        }
        api.update.downloadUpdate()
      })
    }
  }
  function foundNewVersion (value) {
    updateParams.newVersion = true

    if (updateParams.autoDownload !== false) {
      app.$message.info('发现新版本，正在下载中...')
      updateParams.downloading = true
      downloadNewVersion(value)
      return
    }
    app.$confirm({
      title: '发现新版本',
      cancelText: '暂不升级',
      okText: '升级',
      content: h => {
        console.log(value)
        if (value.releaseNotes) {
          const notes = []
          for (const note of value.releaseNotes) {
            notes.push(<li>{note}</li>)
          }
          return <div><div>更新内容：</div><ol>{notes}</ol></div>
        }
      },
      onOk () {
        console.log('OK')
        downloadNewVersion(value)
      },
      onCancel () {
        console.log('Cancel')
      }
    })
  }

  function newUpdateIsReady (value) {
    updateParams.downloading = false
    app.$confirm({
      title: `新版本(v${value.version})已准备好,是否立即升级?`,
      cancelText: '暂不升级',
      okText: '立即升级',
      content: h => {
        console.log(value)
        if (value.releaseNotes) {
          const notes = []
          for (const note of value.releaseNotes) {
            notes.push(<li>{note}</li>)
          }
          return <div><div>更新内容：</div><ol>{notes}</ol></div>
        }
      },
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
