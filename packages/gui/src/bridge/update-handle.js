import { ipcMain, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
// win是所有窗口的引用
// const path = require('path') // 引入path模块
// const fs = require('fs-extra')
// eslint-disable-next-line no-unused-vars
const isMac = process.platform === 'darwin'
// 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
function updateHandle (win, updateUrl) {
  // // 更新前，删除本地安装包 ↓
  // const updaterCacheDirName = 'dev-sidecar-updater'
  // const updatePendingPath = path.join(autoUpdater.app.baseCachePath, updaterCacheDirName, 'pending')
  // fs.emptyDir(updatePendingPath)
  // // 更新前，删除本地安装包 ↑
  const message = {
    error: '更新失败',
    checking: '检查更新中',
    updateAva: '发现新版本',
    updateNotAva: '当前为最新版本，无需更新'
  }
  // 本地开发环境，改变app-update.yml地址
  if (process.env.NODE_ENV === 'development' && !isMac) {
    autoUpdater.updateConfigPath = path.join(__dirname, 'win-unpacked/resources/app-update.yml')
  }
  autoUpdater.autoDownload = false

  // 设置服务器更新地址
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateUrl
  })
  autoUpdater.on('error', function (error) {
    console.log('autoUpdater error', error)
    sendUpdateMessage({ key: 'error', value: error, error: error })
    // dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString())
  })
  autoUpdater.on('checking-for-update', function () {
    console.log('autoUpdater checking-for-update')
    sendUpdateMessage({ key: 'checking', value: message.checking })
  })
  autoUpdater.on('update-available', function (info) {
    console.log('autoUpdater update-available')
    sendUpdateMessage({ key: 'available', value: info })
  })
  autoUpdater.on('update-not-available', function (info) {
    console.log('autoUpdater update-not-available')
    sendUpdateMessage({ key: 'notAvailable', value: message.updateNotAva })
  })
  // 更新下载进度
  autoUpdater.on('download-progress', function (progressObj) {
    console.log('autoUpdater download-progress')
    win.webContents.send('update', { key: 'progress', value: parseInt(progressObj.percent) })
  })
  // 更新完成，重启应用
  autoUpdater.on('update-downloaded', function (info) {
    console.log('download complete', info.version)
    win.webContents.send('update', {
      key: 'downloaded',
      value: {
        version: info.version,
        releaseData: info.releaseDate
      }
    })
  })

  ipcMain.on('update', (e, arg) => {
    if (arg.key === 'doUpdateNow') {
      // some code here to handle event
      autoUpdater.quitAndInstall(true, true)
    } else if (arg.key === 'checkForUpdate') {
      // 执行自动更新检查
      console.log('autoUpdater checkForUpdates')
      autoUpdater.checkForUpdates()
    } else if (arg.key === 'downloadUpdate') {
      // 下载新版本
      console.log('autoUpdater downloadUpdate')
      autoUpdater.downloadUpdate()
    }
  })
  // 通过main进程发送事件给renderer进程，提示更新信息
  function sendUpdateMessage (message) {
    console.log('autoUpdater sendUpdateMessage')
    win.webContents.send('update', message)
  }

  console.log('auto update inited')
  return autoUpdater
}
export default updateHandle
