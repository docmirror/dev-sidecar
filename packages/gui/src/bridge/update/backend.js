import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import request from 'request'
import progress from 'request-progress'
// win是所有窗口的引用
import fs from 'fs'
import AdmZip from 'adm-zip'
import logger from '../../utils/util.log'
import appPathUtil from '../../utils/util.apppath'
// eslint-disable-next-line no-unused-vars
const isMac = process.platform === 'darwin'

function downloadFile (uri, filePath, onProgress, onSuccess, onError) {
  progress(request(uri), {
    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
  })
    .on('progress', function (state) {
      onProgress(state.percent * 100)
      logger.log('progress', state.percent)
    })
    .on('error', function (err) {
      // Do something with err
      logger.error('下载升级包失败', err)
      onError(err)
    })
    .on('end', function () {
      // Do something after request finishes
      onSuccess()
    })
    .pipe(fs.createWriteStream(filePath))
}

// 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
function updateHandle (app, api, win, beforeQuit, quit, log) {
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
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'http://localhost/dev-sidecar/'
    })
    if (isMac) {
      autoUpdater.updateConfigPath = path.join(__dirname, 'mac/DevSidecar.app/Contents/Resources/app-update.yml')
    } else {
      autoUpdater.updateConfigPath = path.join(__dirname, 'win-unpacked/resources/app-update.yml')
    }
  }
  autoUpdater.autoDownload = false

  let partPackagePath = null

  function downloadPart (app, value) {
    const appPath = appPathUtil.getAppRootPath(app)
    const fileDir = path.join(appPath, 'update')
    logger.info('download dir', fileDir)
    try {
      fs.accessSync(fileDir, fs.constants.F_OK)
    } catch (e) {
      fs.mkdirSync(fileDir)
    }
    const filePath = path.join(fileDir, value.version + '.zip')

    downloadFile(value.partPackage, filePath, (data) => {
      win.webContents.send('update', { key: 'progress', value: parseInt(data) })
    }, () => {
      // 文件下载完成
      win.webContents.send('update', { key: 'progress', value: 100 })
      logger.info('升级包下载成功：', filePath)
      partPackagePath = filePath
      win.webContents.send('update', {
        key: 'downloaded',
        value: value
      })
    }, (error) => {
      sendUpdateMessage({ key: 'error', value: error, error: error })
    })
  }

  async function updatePart (app, api, value, partPackagePath, quit) {
    const appPath = appPathUtil.getAppRootPath(app)
    const platform = api.shell.getSystemPlatform()
    let target = path.join(appPath, 'resources')
    if (platform === 'mac') {
      target = path.join(appPath, 'Resources')
    }

    log.info('开始解压缩，安装升级包', partPackagePath, target)

    try {
      await beforeQuit()
      app.relaunch()
      // 解压缩
      const zip = new AdmZip(partPackagePath)
      zip.extractAllTo(target, true)
      log.info('安装完成，重启app')
    } finally {
      app.exit(0)
    }
  }

  autoUpdater.on('error', function (error) {
    log.info('autoUpdater error', error)
    sendUpdateMessage({ key: 'error', value: error, error: error })
    // dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString())
  })
  autoUpdater.on('checking-for-update', function () {
    log.info('autoUpdater checking-for-update')
    sendUpdateMessage({ key: 'checking', value: message.checking })
  })
  autoUpdater.on('update-available', function (info) {
    log.info('autoUpdater update-available')
    sendUpdateMessage({ key: 'available', value: info })
  })
  autoUpdater.on('update-not-available', function (info) {
    log.info('autoUpdater update-not-available')
    sendUpdateMessage({ key: 'notAvailable', value: message.updateNotAva })
  })
  // 更新下载进度
  autoUpdater.on('download-progress', function (progressObj) {
    log.info('autoUpdater download-progress')
    win.webContents.send('update', { key: 'progress', value: parseInt(progressObj.percent) })
  })
  // 更新完成，重启应用
  autoUpdater.on('update-downloaded', function (info) {
    log.info('download complete', info.version)
    win.webContents.send('update', {
      key: 'downloaded',
      value: info
    })
  })

  ipcMain.on('update', (e, arg) => {
    if (arg.key === 'doUpdateNow') {
      if (partPackagePath) {
        updatePart(app, api, arg.value, partPackagePath)
        return
      }
      // some code here to handle event
      beforeQuit().then(() => {
        autoUpdater.quitAndInstall()
        if (app) {
          setTimeout(() => {
            app.exit()
          }, 1000)
        }
      })
    } else if (arg.key === 'checkForUpdate') {
      // 执行自动更新检查
      log.info('autoUpdater checkForUpdates')
      autoUpdater.checkForUpdates()
    } else if (arg.key === 'downloadUpdate') {
      // 下载新版本
      log.info('autoUpdater downloadUpdate')
      autoUpdater.downloadUpdate()
    } else if (arg.key === 'downloadPart') {
      // 下载增量更新版本
      log.info('autoUpdater downloadPart')
      // autoUpdater.downloadUpdate()
      downloadPart(app, arg.value)
    }
  })
  // 通过main进程发送事件给renderer进程，提示更新信息
  function sendUpdateMessage (message) {
    log.info('autoUpdater sendUpdateMessage')
    win.webContents.send('update', message)
  }

  log.info('auto update inited')
  return autoUpdater
}

export default {
  install (context) {
    const { app, api, win, beforeQuit, quit, log } = context
    if (process.env.NODE_ENV === 'development') {
      Object.defineProperty(app, 'isPackaged', {
        get () {
          return true
        }
      })
    }
    updateHandle(app, api, win, beforeQuit, quit, log)
  }
}
