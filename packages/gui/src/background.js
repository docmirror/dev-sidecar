'use strict'
/* global __static */
import path from 'path'
import { app, protocol, BrowserWindow, Menu, Tray, ipcMain, dialog, powerMonitor, nativeImage, nativeTheme, globalShortcut } from 'electron'
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
let winIsHidden = false
// eslint-disable-next-line no-unused-vars
let tray // 防止被内存清理
let forceClose = false
DevSidecar.api.config.reload()
let hideDockWhenWinClose = DevSidecar.api.config.get().app.dock.hideWhenWinClose || false
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

function openDevTools () {
  try {
    log.debug('尝试打开 `开发者工具`')
    win.webContents.openDevTools()
    log.debug('打开 `开发者工具` 成功')
  } catch (e) {
    log.error('打开 `开发者工具` 失败:', e)
  }
}

function closeDevTools () {
  try {
    log.debug('尝试关闭 `开发者工具`')
    win.webContents.closeDevTools()
    log.debug('关闭 `开发者工具` 成功')
  } catch (e) {
    log.error('关闭 `开发者工具` 失败:', e)
  }
}

function switchDevTools () {
  if (!win || !win.webContents) {
    return
  }
  if (win.webContents.isDevToolsOpened()) {
    closeDevTools()
  } else {
    openDevTools()
  }
}

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
      label: 'DevTools (F12)',
      click: switchDevTools
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

  appTray.on('right-click', function () {
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
      quit()
      return
    }
    win.hide()
    if (isMac && hideDockWhenWinClose) {
      app.dock.hide()
    }
    winIsHidden = true
  }
}

function showWin () {
  if (win) {
    win.show()
  }
  if (app.dock) {
    app.dock.show()
  }
  winIsHidden = false
}

function changeAppConfig (config) {
  if (config.hideDockWhenWinClose != null) {
    hideDockWhenWinClose = config.hideDockWhenWinClose
  }
}

function createWindow (startHideWindow) {
  // Create the browser window.
  const windowSize = DevSidecar.api.config.get().app.windowSize || {}
  win = new BrowserWindow({
    width: windowSize.width || 900,
    height: windowSize.height || 750,
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
  winIsHidden = !!startHideWindow

  Menu.setApplicationMenu(null)
  win.setMenu(null)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) {
      setTimeout(openDevTools, 2000)
    }
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  if (startHideWindow) {
    hideWin()
  }

  win.on('closed', async () => {
    log.info('win closed:', arguments)
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
    log.info('win close:', arguments)
    if (forceClose) {
      return
    }
    e.preventDefault()
    if (isLinux()) {
      quit()
      return
    }
    const config = DevSidecar.api.config.get()
    const closeStrategy = config.app.closeStrategy
    if (closeStrategy === 0) {
      // 弹窗提示，选择关闭策略
      win.webContents.send('close.showTip', closeStrategy)
    } else if (closeStrategy === 1) {
      // 直接退出
      quit()
    } else if (closeStrategy === 2) {
      // 隐藏窗口
      hideWin()
    }
  })

  win.on('session-end', async (e) => {
    log.info('win session-end:', arguments)
    await quit()
  })

  const shortcut = (event, input) => {
    // 按 F12，打开/关闭 开发者工具
    if (input.key === 'F12') {
      // 阻止默认的按键事件行为
      event.preventDefault()
      // 切换开发者工具显示状态
      switchDevTools()
      // eslint-disable-next-line brace-style
    }
    // 按 F5，刷新页面
    else if (input.key === 'F5') {
      // 阻止默认的按键事件行为
      event.preventDefault()
      // 刷新页面
      win.webContents.reload()
    }
  }

  // 监听键盘事件
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyUp' || input.control || input.alt || input.shift || input.meta) {
      return
    }
    win.webContents.executeJavaScript('config')
      .then((value) => {
        console.info('window.config:', value, ', key:', input.key)
        if (!value || (value.disableBeforeInputEvent !== true && value.disableBeforeInputEvent !== 'true')) {
          shortcut(event, input)
        }
      })
      .catch(() => {
        shortcut(event, input)
      })
  })

  // 监听渲染进程发送过来的消息
  win.webContents.on('ipc-message', (event, channel, message) => {
    console.info('win ipc-message:', arguments)
    if (channel === 'change-showHideShortcut') {
      registerShowHideShortcut(message)
    }
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

function registerShowHideShortcut (showHideShortcut) {
  globalShortcut.unregisterAll()
  if (showHideShortcut && showHideShortcut !== '无' && showHideShortcut.length > 1) {
    try {
      const registerSuccess = globalShortcut.register(DevSidecar.api.config.get().app.showHideShortcut, () => {
        if (winIsHidden || !win.isFocused()) {
          if (!win.isFocused()) {
            win.focus()
          }
          if (winIsHidden) {
            showWin()
          }
        } else {
          // linux，快捷键不关闭窗口
          if (!isLinux()) {
            hideWin()
          }
        }
      })

      if (registerSuccess) {
        log.info('注册快捷键成功:', DevSidecar.api.config.get().app.showHideShortcut)
      } else {
        log.error('注册快捷键失败:', DevSidecar.api.config.get().app.showHideShortcut)
      }
    } catch (e) {
      log.error('注册快捷键异常:', DevSidecar.api.config.get().app.showHideShortcut, ', error:', e)
    }
  }
}

function initApp () {
  if (isMac) {
    app.whenReady().then(() => {
      app.dock.setIcon(path.join(__dirname, '../build/mac/512x512.png'))
    })
  }

  // 全局监听快捷键，用于 显示/隐藏 窗口
  app.whenReady().then(async () => {
    registerShowHideShortcut(DevSidecar.api.config.get().app.showHideShortcut)
  })
}

// -------------执行开始---------------
app.disableHardwareAcceleration() // 禁用gpu

// 开启后是否默认隐藏window
let startHideWindow = !DevSidecar.api.config.get().app.startShowWindow
if (app.getLoginItemSettings().wasOpenedAsHidden) {
  startHideWindow = true
} else if (process.argv) {
  const args = minimist(process.argv)
  log.info('start args:', args)

  // 通过启动参数，判断是否隐藏窗口
  const hideWindowArg = args.hideWindow + ''
  if (hideWindowArg === 'true' || hideWindowArg === '1') {
    startHideWindow = true
  } else if (hideWindowArg === 'false' || hideWindowArg === '0') {
    startHideWindow = false
  }
}
log.info('start hide window:', startHideWindow, app.getLoginItemSettings())

// 禁止双开
const isFirstInstance = app.requestSingleInstanceLock()
if (!isFirstInstance) {
  log.info('is second instance')
  setTimeout(() => {
    app.quit()
  }, 1000)
} else {
  app.on('before-quit', async () => {
    log.info('before-quit')
    if (process.platform === 'darwin') {
      quit()
    }
  })
  app.on('will-quit', () => {
    log.info('应用关闭，注销所有快捷键')
    globalShortcut.unregisterAll()
  })
  app.on('second-instance', (event, commandLine) => {
    log.info('new app started, command:', commandLine)
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
      quit()
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

  // initApp()

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
      log.info('error:', err)
    }

    try {
      // 最小化到托盘
      tray = setTray()
    } catch (err) {
      log.info('error:', err)
    }

    powerMonitor.on('shutdown', async (e) => {
      e.preventDefault()
      log.info('系统关机，恢复代理设置')
      await quit()
    })
  })
}

initApp()

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        quit()
      }
    })
  } else {
    process.on('SIGINT', () => {
      quit()
    })
  }
}
// 系统关机和重启时的操作
process.on('exit', function () {
  log.info('进程结束，退出app')
  quit()
})
