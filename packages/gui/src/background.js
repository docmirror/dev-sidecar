'use strict'
/* global __static */
import path from 'path'
import { app, protocol, BrowserWindow, Menu, Tray, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import backend from './bridge/backend'
import DevSidecar from '@docmirror/dev-sidecar'
import log from './utils/util.log'
import minimist from 'minimist'
// eslint-disable-next-line no-unused-vars
const isMac = process.platform === 'darwin'
// import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
// eslint-disable-next-line no-unused-vars
let tray // 防止被内存清理
let forceClose = false

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

// 隐藏主窗口，并创建托盘，绑定关闭事件
function setTray (app) {
  // 用一个 Tray 来表示一个图标,这个图标处于正在运行的系统的通知区
  // 通常被添加到一个 context menu 上.
  // 系统托盘右键菜单
  const trayMenuTemplate = [
    {
      // 系统托盘图标目录
      label: '退出',
      click: () => {
        forceClose = true
        quit(app)
      }
    }
  ]
  // 设置系统托盘图标
  let icon = '128x128.png'
  if (isMac) {
    icon = '16x16.png'
  }
  const iconPath = path.join(__dirname, '../extra/icons/', icon)
  const appTray = new Tray(iconPath)

  // 图标的上下文菜单
  const contextMenu = Menu.buildFromTemplate(trayMenuTemplate)

  // 设置托盘悬浮提示
  appTray.setToolTip('DevSidecar-开发者边车辅助工具')

  // 单击托盘小图标显示应用
  appTray.on('click', () => {
    // 显示主程序
    win.show()
  })

  // 设置托盘菜单
  // appTray.setContextMenu(contextMenu)

  // appTray.on('double-click', function () {
  //   log.info('double click')
  //   win.show()
  // })
  appTray.on('right-click', function (event, bounds) {
    setTimeout(function () {
      appTray.popUpContextMenu(contextMenu)
    }, 200)
  })

  return appTray
}

function createWindow () {
  // Create the browser window.

  let startHideWindow = false
  if (process.argv) {
    const args = minimist(process.argv)
    if (args.hideWindow) {
      startHideWindow = true
    }
  }

  win = new BrowserWindow({
    width: 900,
    height: 750,
    title: 'DevSidecar',
    webPreferences: {
      enableRemoteModule: true,
      // preload: path.join(__dirname, 'preload.js'),
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true// process.env.ELECTRON_NODE_INTEGRATION
    },
    show: !startHideWindow,
    // eslint-disable-next-line no-undef
    icon: path.join(__static, 'icon.png')
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  if (startHideWindow) {
    win.hide()
  }

  win.on('closed', async (e) => {
    win = null
    tray = null
  })

  win.on('close', (e) => {
    if (!forceClose) {
      e.preventDefault()
      win.hide()
    }
  })
}

async function beforeQuit () {
  return DevSidecar.api.shutdown()
}
async function quit (app, callback) {
  if (tray) {
    tray.displayBalloon({ title: '正在关闭', content: '关闭中,请稍候。。。' })
  }
  await beforeQuit()
  forceClose = true
  app.quit()
}

// eslint-disable-next-line no-unused-vars
function setDock () {
  const { app } = require('electron')
  if (process.platform === 'darwin') {
    app.whenReady().then(() => {
      app.dock.setIcon(path.join(__dirname, '../build/mac/512x512.png'))
    })
  }
}
// -------------执行开始---------------
app.disableHardwareAcceleration() // 禁用gpu

// 禁止双开
const isFirstInstance = app.requestSingleInstanceLock()
if (!isFirstInstance) {
  log.info('is second instance')
  setTimeout(() => {
    app.quit()
  }, 1000)
} else {
  app.on('before-quit', async (event) => {
    log.info('before-quit')
    if (process.platform === 'darwin') {
      quit(app)
    }
  })
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log.info('new app started', commandLine)
    if (win) {
      win.show()
      win.focus()
    }
  })

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      quit(app)
    }
  })

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win == null) {
      createWindow()
    } else {
      win.show()
    }
  })

  // setDock()

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
      // Install Vue Devtools
      // try {
      //   await installExtension(VUEJS_DEVTOOLS)
      // } catch (e) {
      //   log.error('Vue Devtools failed to install:', e.toString())
      // }
    }
    try {
      createWindow()
      const context = { win, app, beforeQuit, quit, ipcMain, dialog, log, api: DevSidecar.api }
      backend.install(context) // 模块安装
    } catch (err) {
      log.info('err', err)
    }

    try {
      // 最小化到托盘
      tray = setTray(app)
    } catch (err) {
      log.info('err', err)
    }
  })
}

setDock()

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        quit(app)
      }
    })
  } else {
    process.on('SIGINT', () => {
      quit(app)
    })
  }
}
