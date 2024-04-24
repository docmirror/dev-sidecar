import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import request from 'request'
import progress from 'request-progress'
import fs from 'fs'
import AdmZip from 'adm-zip'
import log from '../../utils/util.log'
import appPathUtil from '../../utils/util.apppath'
import pkg from '../../../package.json'
import DevSidecar from '@docmirror/dev-sidecar'

// eslint-disable-next-line no-unused-vars
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

function downloadFile (uri, filePath, onProgress, onSuccess, onError) {
  log.info('download url', uri)
  progress(request(uri), {
    // throttle: 2000,                    // Throttle the progress event to 2000ms, defaults to 1000ms
    // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
  })
    .on('progress', function (state) {
      onProgress(state.percent * 100)
      log.log('progress', state.percent)
    })
    .on('error', function (err) {
      // Do something with err
      log.error('下载升级包失败', err)
      onError(err)
    })
    .on('end', function () {
      // Do something after request finishes
      onSuccess()
    })
    .pipe(fs.createWriteStream(filePath))
}

/**
 * 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
 *
 * @param win win是所有窗口的引用
 */
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
  if (process.env.NODE_ENV === 'development') {
    // const publishUrl = process.env.VUE_APP_PUBLISH_URL
    // autoUpdater.setFeedURL({
    //   provider: 'generic',
    //   url: publishUrl
    // })
    if (isMac) {
      autoUpdater.updateConfigPath = path.join(__dirname, 'mac/dev-sidecar.app/Contents/Resources/app-update.yml')
    } else if (isLinux) {
      autoUpdater.updateConfigPath = path.join(__dirname, 'linux-unpacked/resources/app-update.yml')
    } else {
      autoUpdater.updateConfigPath = path.join(__dirname, 'win-unpacked/resources/app-update.yml')
    }
  }

  log.info('auto updater', autoUpdater.getFeedURL())
  autoUpdater.autoDownload = false

  let partPackagePath = null

  // 检查更新
  const releasesApiUrl = 'https://api.github.com/repos/docmirror/dev-sidecar/releases'
  async function checkForUpdatesFromGitHub () {
    request(releasesApiUrl, { headers: { 'User-Agent': 'DS/' + pkg.version } }, (error, response, body) => {
      try {
        if (error) {
          log.error('检查更新失败:', error)
          const errorMsg = '检查更新失败：' + error
          win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: errorMsg })
          return
        }
        if (response && response.statusCode === 200) {
          if (body == null || body.length < 2) {
            log.warn('检查更新失败，github API返回数据为空:', body)
            win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败，github 返回数据为空' })
            return
          }

          // 尝试解析API响应内容
          let data
          try {
            data = JSON.parse(body)
          } catch (e) {
            log.error('检查更新失败，github API返回数据格式不正确:', body)
            win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败，github API返回数据格式不正确' })
            return
          }

          if (typeof data !== 'object' || data.length === undefined) {
            log.error('检查更新失败，github API返回数据不是数组:', body)
            win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败，github API返回数据不是数组' })
            return
          }

          // log.info('github api返回的release数据：', JSON.stringify(data, null, '\t'))

          // 检查更新
          for (let i = 0; i < data.length; i++) {
            const versionData = data[i]

            if (!versionData.assets || versionData.assets.length === 0) {
              continue // 跳过空版本，即上传过安装包
            }
            if (DevSidecar.api.config.get().app.skipPreRelease && versionData.name.indexOf('Pre-release') >= 0) {
              continue // 跳过预发布版本
            }

            // log.info('最近正式版本数据：', versionData)

            let version = versionData.tag_name
            if (version.indexOf('v') === 0) {
              version = version.substring(1)
            }
            if (version !== pkg.version) {
              log.info('检查更新-发现新版本:', version)
              win.webContents.send('update', {
                key: 'available',
                value: {
                  version,
                  releaseNotes: versionData.body
                    ? (versionData.body.replace(/\r\n/g, '\n').replace(/https:\/\/github.com\/docmirror\/dev-sidecar/g, '').replace(/(?<=(^|\n))[ \t]*[ #]+/g, '') || '无')
                    : '无'
                }
              })
            } else {
              log.info('检查更新-没有新版本，最新版本号为:', version)
              win.webContents.send('update', { key: 'notAvailable' })
            }

            return // 只检查最近一个正式版本
          }

          log.info('检查更新-没有正式版本数据')
          win.webContents.send('update', { key: 'notAvailable' })
        } else {
          log.error('检查更新失败, status:', response.statusCode, ', body:', body)

          let bodyObj
          try {
            bodyObj = JSON.parse(body)
          } catch (e) {
            bodyObj = null
          }

          let message
          if (response) {
            message = '检查更新失败: ' + (bodyObj && bodyObj.message ? bodyObj.message : response.message) + ', code: ' + response.statusCode
          } else {
            message = '检查更新失败: ' + (bodyObj && bodyObj.message ? bodyObj.message : body)
          }
          win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: message })
        }
      } catch (e) {
        log.error('检查更新失败:', e)
        win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败:' + e.message })
      }
    })
  }

  // 下载升级包
  function downloadPart (app, value) {
    const appPath = appPathUtil.getAppRootPath(app)
    const fileDir = path.join(appPath, 'update')
    log.info('download dir:', fileDir)
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
      log.info('升级包下载成功：', filePath)
      partPackagePath = filePath
      win.webContents.send('update', {
        key: 'downloaded',
        value: value
      })
    }, (error) => {
      sendUpdateMessage({ key: 'error', value: error, error: error })
    })
  }

  async function updatePart (app, api, value, partPackagePath) {
    const appPath = appPathUtil.getAppRootPath(app)
    const platform = api.shell.getSystemPlatform()
    let target = path.join(appPath, 'resources')
    if (platform === 'mac') {
      target = path.join(appPath, 'Resources')
    }
    const length = fs.statSync(partPackagePath)
    log.info('安装包大小:', length)

    log.info('开始解压缩，安装升级包:', partPackagePath, target)

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
    log.warn('autoUpdater error:', error)
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
  autoUpdater.on('update-not-available', function () {
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
    log.info('download complete, version:', info.version)
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
      log.info('autoUpdater checkForUpdates:', arg.fromUser)

      // 调用 github API，获取release数据，来检查更新
      // autoUpdater.checkForUpdates()
      checkForUpdatesFromGitHub()
    } else if (arg.key === 'downloadUpdate') {
      // 下载新版本
      log.info('autoUpdater downloadUpdate')
      autoUpdater.downloadUpdate()
    } else if (arg.key === 'downloadPart') {
      // 下载增量更新版本
      log.info('autoUpdater downloadPart')
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
