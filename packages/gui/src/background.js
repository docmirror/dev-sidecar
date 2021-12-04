'use strict'
/* global __static */
import path from 'path'
import { app, protocol, BrowserWindow, Menu, Tray, ipcMain, dialog, powerMonitor, nativeImage, nativeTheme } from 'electron'
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
DevSidecar.api.config.reload()
let hideDockWhenWinClose = DevSidecar.api.config.get().app.dock.hideWhenWinClose || false
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])
// 隐藏主窗口，并创建托盘，绑定关闭事件
function setTray () {
  // const topMenu = Menu.buildFromTemplate({})
  // Menu.setApplicationMenu(topMenu)
  // 用一个 Tray 来表示一个图标,这个图标处于正在运行的系统的通知区
  // 通常被添加到一个 context menu 上.
  // 系统托盘右键菜单
  const trayMenuTemplate = [

    {
      // 系统托盘图标目录
      label: 'DevTools',
      click: () => {
        win.webContents.openDevTools()
      }
    },
    {
      // 系统托盘图标目录
      label: '退出',
      click: () => {
        log.info('force quit')
        forceClose = true
        quit()
      }
    }
  ]
  // 设置系统托盘图标
  const iconRootPath = path.join(__dirname, '../extra/icons/tray')
  let iconPath = path.join(iconRootPath, 'icon.png')
  const iconWhitePath = path.join(iconRootPath, 'icon-white.png')
  const iconBlackPath = path.join(iconRootPath, 'icon-black.png')
  if (isMac) {
    iconPath = nativeTheme.shouldUseDarkColors ? iconWhitePath : iconBlackPath
  }

  const trayIcon = nativeImage.createFromPath(iconPath)
  const appTray = new Tray(trayIcon)

  // 当桌面主题更新时
  if (isMac) {
    nativeTheme.on('updated', () => {
      console.log('i am changed')
      if (nativeTheme.shouldUseDarkColors) {
        console.log('i am dark.')
        tray.setImage(iconWhitePath)
      } else {
        console.log('i am light.')
        tray.setImage(iconBlackPath)
        // tray.setPressedImage(iconWhitePath)
      }
    })
  }

  // 图标的上下文菜单
  const contextMenu = Menu.buildFromTemplate(trayMenuTemplate)

  // 设置托盘悬浮提示
  appTray.setToolTip('DevSidecar-开发者边车辅助工具')
  // 单击托盘小图标显示应用
  appTray.on('click', () => {
    // 显示主程序
    showWin()
  })

  appTray.on('right-click', function (event, bounds) {
    setTimeout(function () {
      appTray.popUpContextMenu(contextMenu)
    }, 200)
  })

  return appTray
}

function isLinux () {
  const platform = DevSidecar.api.shell.getSystemPlatform()
  return platform === 'linux'
}

function hideWin () {
  if (win) {
    if (isLinux()) {
      quit(app)
      return
    }
    win.hide()
    if (isMac && hideDockWhenWinClose) {
      app.dock.hide()
    }
  }
}

function showWin () {
  if (win) {
    win.show()
  }
  if (app.dock) {
    app.dock.show()
  }
}

function changeAppConfig (config) {
  if (config.hideDockWhenWinClose != null) {
    hideDockWhenWinClose = config.hideDockWhenWinClose
  }
}

function createWindow (startHideWindow) {
  // Create the browser window.

  win = new BrowserWindow({
    width: 900,
    height: 750,
    title: 'DevSidecar',
    webPreferences: {
      enableRemoteModule: true,
      contextIsolation: false,
      nativeWindowOpen: true, // ADD THIS
      // preload: path.join(__dirname, 'preload.js'),
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true// process.env.ELECTRON_NODE_INTEGRATION
    },
    show: !startHideWindow,
    // eslint-disable-next-line no-undef
    icon: path.join(__static, 'icon.png')
  })

  Menu.setApplicationMenu(null)
  win.setMenu(null)

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
    hideWin()
  }

  win.on('closed', async (e) => {
    win = null
    tray = null
  })

  ipcMain.on('close', async (event, message) => {
    if (message.value === 1) {
      quit()
    } else {
      hideWin()
    }
  })

  win.on('close', (e) => {
    if (forceClose) {
      return
    }
    e.preventDefault()
    if (isLinux()) {
      quit(app)
      return
    }
    const config = DevSidecar.api.config.get()
    const closeStrategy = config.app.closeStrategy
    if (closeStrategy === 0) {
      // 提醒
      win.webContents.send('close.showTip')
    } else if (closeStrategy === 1) {
      // 直接退出
      quit()
    } else if (closeStrategy === 2) {
      // 隐藏窗口
      hideWin()
    }
  })

  win.on('session-end', async (e) => {
    log.info('session-end', e)
    await quit()
  })
}

async function beforeQuit () {
  return DevSidecar.api.shutdown()
}
async function quit () {
  if (tray) {
    tray.displayBalloon({ title: '正在关闭', content: '关闭中,请稍候。。。' })
  }
  await beforeQuit()
  forceClose = true
  app.quit()
}

// eslint-disable-next-line no-unused-vars
function setDock () {
  if (isMac) {
    app.whenReady().then(() => {
      app.dock.setIcon(path.join(__dirname, '../build/mac/512x512.png'))
    })
  }
}
// -------------执行开始---------------
app.disableHardwareAcceleration() // 禁用gpu

// 开启后是否默认隐藏window
let startHideWindow = false
if (process.argv) {
  const args = minimist(process.argv)
  if (args.hideWindow) {
    startHideWindow = true
  }

  log.info('start args', args)
}
if (app.getLoginItemSettings().wasOpenedAsHidden) {
  startHideWindow = true
}
log.info('start hide window', startHideWindow, app.getLoginItemSettings())

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
      showWin()
      win.focus()
    }
  })

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    log.info('window-all-closed')
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
      createWindow(false)
    } else {
      showWin()
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
      createWindow(startHideWindow)
      const context = { win, app, beforeQuit, quit, ipcMain, dialog, log, api: DevSidecar.api, changeAppConfig }
      backend.install(context) // 模块安装
    } catch (err) {
      log.info('err', err)
    }

    try {
      // 最小化到托盘
      tray = setTray()
    } catch (err) {
      log.info('err', err)
    }

    powerMonitor.on('shutdown', async (e) => {
      e.preventDefault()
      log.info('系统关机，恢复代理设置')
      await quit()
    })
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
// 系统关机和重启时的操作
process.on('exit', function () {
  log.info('进程结束，退出app')
  quit()
})
