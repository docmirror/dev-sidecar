import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

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
    error: 'update error',
    checking: 'updating...',
    updateAva: 'fetch new version and downloading...',
    updateNotAva: 'do not to update'
  }
  // 本地开发环境，改变app-update.yml地址
  // if (process.env.NODE_ENV === 'development' && !isMac) {
  //   autoUpdater.updateConfigPath = path.join(__dirname, 'win-unpacked/resources/app-update.yml')
  // }
  // 设置服务器更新地址
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateUrl
  })
  autoUpdater.on('error', function (err) {
    console.log('autoUpdater error', err)
    sendUpdateMessage(message.error)
  })
  autoUpdater.on('checking-for-update', function () {
    console.log('autoUpdater checking-for-update')
    sendUpdateMessage(message.checking)
  })
  // 准备更新，打开进度条读取页面，关闭其他页面
  autoUpdater.on('update-available', function (info) {
    console.log('autoUpdater update-available')
    sendUpdateMessage(message.updateAva)
  })
  autoUpdater.on('update-not-available', function (info) {
    console.log('autoUpdater update-not-available')
    sendUpdateMessage(message.updateNotAva)
  })
  // 更新下载进度
  autoUpdater.on('download-progress', function (progressObj) {
    console.log('autoUpdater download-progress')
    win.webContents.send('download-progress', parseInt(progressObj.percent))
  })
  // 更新完成，重启应用
  autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {
    ipcMain.on('isUpdateNow', (e, arg) => {
      // some code here to handle event
      autoUpdater.quitAndInstall()
    })
    win.webContents.send('isUpdateNow')
  })
  ipcMain.on('checkForUpdate', () => {
    // 执行自动更新检查
    console.log('autoUpdater checkForUpdates')
    autoUpdater.checkForUpdates()
  })
  // 通过main进程发送事件给renderer进程，提示更新信息
  function sendUpdateMessage (text) {
    console.log('autoUpdater sendUpdateMessage')
    win.webContents.send('message', text)
  }

  console.log('auto update inited')
}
export default updateHandle
