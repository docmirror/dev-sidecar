function install (app, api) {
  const updateParams = app.$global.update = { fromUser: false, autoDownload: false, progress: 0, checking: false, downloading: false, newVersion: false, isFullUpdate: true }
  api.ipc.on('update', (event, message) => {
    console.log('on message', event, message)
    handleUpdateMessage(message, app)
  })

  api.update = {
    checkForUpdate (fromUser) {
      if (fromUser != null) {
        updateParams.fromUser = fromUser
      }
      if (updateParams.fromUser) {
        updateParams.checking = true
      }
      api.ipc.send('update', { key: 'checkForUpdate', fromUser })
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
      updateParams.checking = false
      foundNewVersion(message.value)
    } else if (type === 'notAvailable') {
      updateParams.checking = false
      noNewVersion()
    } else if (type === 'downloaded') {
      // 更新包已下载完成，让用户确认是否更新
      updateParams.downloading = false
      console.log('updateParams', updateParams)
      newUpdateIsReady(message.value)
    } else if (type === 'progress') {
      progressUpdate(message.value)
    } else if (type === 'error') {
      updateParams.checking = false
      updateParams.downloading = false
      const error = message.error
      app.$message.error((error == null ? '未知错误' : (error.stack || error).toString()))
    }
  }

  function noNewVersion () {
    updateParams.newVersion = false
    if (updateParams.fromUser) {
      app.$message.info('当前已经是最新版本')
    }
  }

  function progressUpdate (value) {
    updateParams.progress = value
  }

  function openGithubUrl () {
    api.ipc.openExternal('https://github.com/docmirror/dev-sidecar/releases')
  }

  function goManualUpdate (value) {
    updateParams.newVersion = false
    app.$confirm({
      // title: '暂不支持自动升级',
      title: '暂不提供自动升级',
      cancelText: '取消',
      okText: '打开',
      width: 420,
      content: h => {
        return <div>
          <div>请前往 <a onClick={openGithubUrl}>github项目release页面</a> 下载新版本手动安装</div>
          <div><a onClick={openGithubUrl}>https://github.com/docmirror/dev-sidecar/releases</a></div>
        </div>
      },
      onOk () {
        openGithubUrl()
      }
    })
  }

  // /**
  //  * 是否小版本升级
  //  * @param value
  //  */
  // async function isSupportPartUpdate (value) {
  //   const info = await api.info.get()
  //   console.log('升级版本:', value.version)
  //   console.log('增量更新最小版本:', value.partMiniVersion)
  //   console.log('当前版本:', info.version)
  //   if (!value.partPackage) {
  //     return false
  //   }
  //   return !!(value.partMiniVersion && value.partMiniVersion < info.version)
  // }

  async function downloadNewVersion (value) {
    // 暂时取消自动更新功能
    goManualUpdate(value)

    // const platform = await api.shell.getSystemPlatform()
    // console.log(`download new version: ${JSON.stringify(value)}, platform: ${platform}`)
    // if (platform === 'linux') {
    //   goManualUpdate(value)
    //   return
    // }
    // const partUpdate = await isSupportPartUpdate(value)
    // if (partUpdate) {
    //   // 有增量更新
    //   api.update.downloadPart(value)
    // } else {
    //   if (platform === 'mac') {
    //     goManualUpdate(value)
    //     return
    //   }
    //   updateParams.downloading = true
    //   api.update.downloadUpdate()
    // }
  }
  function foundNewVersion (value) {
    updateParams.newVersion = true

    if (updateParams.autoDownload !== false) {
      app.$message.info('发现新版本，正在下载中...')

      downloadNewVersion(value)
      return
    }
    console.log(value)
    app.$confirm({
      title: '发现新版本：' + value.version,
      cancelText: '暂不升级',
      okText: '升级',
      width: 710,
      content: h => {
        if (value.releaseNotes) {
          if (typeof value.releaseNotes === 'string') {
            return <div>{value.releaseNotes}</div>
          } else {
            const notes = []
            for (const note of value.releaseNotes) {
              notes.push(<li>{note}</li>)
            }
            return <div><div>更新内容：</div><ol>{notes}</ol></div>
          }
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
        api.update.doUpdateNow()
      },
      onCancel () {
      }
    })
  }
}

export default {
  install
}
