function install (app, api) {
  const updateParams = app.config.globalProperties.$global.update = { fromUser: false, autoDownload: false, progress: 0, checking: false, downloading: false, newVersion: false, isFullUpdate: true }
  api.ipc.on('update', (event, message) => {
    console.log('on message', event, message)
    handleUpdateMessage(message, app)
  })

  api.update = {
    checkForUpdate (fromUser) {
      if (fromUser != null) {
        updateParams.fromUser = fromUser
      }
      updateParams.checking = true
      api.ipc.send('update', { key: 'checkForUpdate', fromUser })
    },
    downloadUpdate () {
      api.ipc.send('update', { key: 'downloadUpdate' })
    },
    downloadPart (value) {
      // 增量更新
      api.ipc.send('update', { key: 'downloadPart', value })
    },
    downloadFull (value) {
      // 完整安装包更新
      api.ipc.send('update', { key: 'downloadFull', value })
    },
    doUpdateNow () {
      api.ipc.send('update', { key: 'doUpdateNow' })
    },
  }

  function handleUpdateMessage (message) {
    const type = message.key
    if (type === 'available') {
      updateParams.checking = false
      updateParams.newVersionData = message.value
      foundNewVersion(message.value)
    } else if (type === 'notAvailable') {
      updateParams.checking = false
      noNewVersion()
    } else if (type === 'downloaded') {
      // 更新包已下载完成
      updateParams.downloading = false
      if (message.updateType === 'full') {
        // 完整安装包：自动打开，由用户完成安装
        if (message.filePath) {
          api.ipc.openPath(message.filePath)
        }
        app.config.globalProperties.$message.success(message.filePath ? '完整安装包已下载并自动打开，请按提示完成安装' : '完整安装包已下载完成')
        return
      }
      console.log('updateParams', updateParams)
      newUpdateIsReady(message.value)
    } else if (type === 'progress') {
      progressUpdate(message.value)
    } else if (type === 'error') {
      updateParams.checking = false
      updateParams.downloading = false
      if (message.action === 'checkForUpdate' && updateParams.newVersionData) {
        // 如果检查更新报错了，但刚才成功拿到过一次数据，就拿之前的数据
        foundNewVersion(updateParams.newVersionData)
      } else {
        if (updateParams.fromUser === false && message.action === 'checkForUpdate') {
          return // 不是手动检查更新，不提示错误信息，避免打扰
        }
        const error = message.error
        app.config.globalProperties.$message.error((error == null ? '未知错误' : (error.stack || error).toString()))
      }
    }
  }

  function noNewVersion () {
    updateParams.newVersion = false
    if (updateParams.fromUser) {
      app.config.globalProperties.$message.info('当前已经是最新版本')
    }
  }

  function progressUpdate (value) {
    updateParams.progress = value
  }

  function openGithubUrl () {
    api.ipc.openExternal('https://github.com/docmirror/dev-sidecar/releases')
  }

  function goManualUpdate () {
    updateParams.newVersion = false
    openGithubUrl()
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
    const platform = await api.info.getSystemPlatform()
    console.log(`download new version: ${JSON.stringify(value)}, platform: ${platform}`)
    if (platform === 'linux' && !value.fullPackage) {
      goManualUpdate(value)
      return
    }
    if (value.partPackage) {
      // 有增量更新 ZIP，走增量更新流程
      updateParams.downloading = true
      api.update.downloadPart(value)
    } else if (value.fullPackage) {
      // 没有增量包时，自动下载当前平台/架构对应的完整安装包
      updateParams.downloading = true
      api.update.downloadFull(value)
    } else {
      goManualUpdate(value)
    }
  }
  function foundNewVersion (value) {
    updateParams.newVersion = true

    if (updateParams.autoDownload !== false) {
      app.config.globalProperties.$message.info('发现新版本，正在下载中...')
      downloadNewVersion(value)
      return
    }

    const hasPartPackage = !!value.partPackage
    const hasFullPackage = !!value.fullPackage
    const okText = hasPartPackage ? '自动更新（实验性）' : hasFullPackage ? '自动下载安装包' : '手动下载'
    const okType = hasPartPackage ? 'danger' : hasFullPackage ? 'primary' : 'default'

    app.config.globalProperties.$confirm({
      title: `发现新版本：v${value.version}`,
      cancelText: '暂不升级',
      okText,
      okType,
      width: 700,
      content: (h) => {
        const children = []
        if (value.releaseNotes) {
          const releaseNotes = typeof value.releaseNotes === 'string'
            ? value.releaseNotes.replace(/\r\n/g, '\n')
            : value.releaseNotes.join('\n')
          children.push(
            h('div', {}, [
              h('span', {}, '发布公告：'),
              h('a', { onClick: openGithubUrl }, 'https://github.com/docmirror/dev-sidecar/releases'),
            ]),
            h('hr'),
            h('pre', { style: { maxHeight: '350px', fontFamily: 'auto' } }, releaseNotes),
          )
        }
        if (hasPartPackage) {
          children.push(
            h('div', { style: { marginTop: '16px', padding: '10px', background: 'var(--warning-bg, #fff7e6)', borderRadius: '4px' } }, [
              h('span', { style: { fontWeight: 'bold' } }, '更新方式说明：'),
              h('ul', { style: { marginTop: '6px', paddingLeft: '20px' } }, [
                h('li', {}, [h('b', {}, '自动更新（实验性）'), ' — 下载增量包自动覆盖，重启即完成。仅 Windows/macOS 支持']),
                h('li', {}, [h('b', {}, '自动下载安装包'), ' — 下载当前平台/架构对应的完整安装包']),
              ]),
            ]),
          )
        }
        if (!hasPartPackage && hasFullPackage) {
          children.push(
            h('div', { style: { marginTop: '12px', color: '#888' } }, `已自动识别当前平台/架构，将下载安装包：${value.fullPackageName || '对应完整安装包'}，下载完成后自动打开供你安装。`),
          )
        }
        if (!hasPartPackage && !hasFullPackage) {
          children.push(
            h('div', { style: { marginTop: '12px' } }, '当前平台/架构暂未匹配到安装包，点击"手动下载"前往 GitHub Releases。'),
          )
        }
        return h('div', {}, children)
      },
      onOk () {
        if (hasPartPackage || hasFullPackage) {
          downloadNewVersion(value)
        } else {
          openGithubUrl()
        }
      },
      onCancel () {},
    })
  }

  function newUpdateIsReady (value) {
    updateParams.downloading = false
    console.log(value)
    app.config.globalProperties.$confirm({
      title: `新版本(v${value.version})已准备好，是否立即升级?`,
      cancelText: '暂不升级',
      okText: '立即升级',
      width: 700,
      content: (_h) => {
        if (value.releaseNotes) {
          const notes = []
          if (typeof value.releaseNotes === 'string') {
            const releaseNotes = value.releaseNotes.replace(/\r\n/g, '\n')
            return (
              <div>
                <div>
                  发布公告：
                  <a onClick={openGithubUrl}>https://github.com/docmirror/dev-sidecar/releases</a>
                </div>
                <hr />
                <pre style="max-height:350px;font-family:auto">
                  {releaseNotes}
                </pre>
              </div>
            )
          } else {
            for (const note of value.releaseNotes) {
              notes.push(<li>{note}</li>)
            }
            return (
              <div>
                <div>
                  发布公告：
                  <a onClick={openGithubUrl}>https://github.com/docmirror/dev-sidecar/releases</a>
                </div>
                <div>更新内容：</div>
                <ol>{notes}</ol>
              </div>
            )
          }
        }
      },
      onOk () {
        api.update.doUpdateNow()
      },
    })
  }
}

export default {
  install,
}
