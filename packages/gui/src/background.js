'use strict'
/* global __static */
import path from 'node:path'
import DevSidecar from '@docmirror/dev-sidecar'
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, powerMonitor, protocol, Tray } from 'electron'
import minimist from 'minimist'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import backend from './bridge/backend'
import jsonApi from '@docmirror/mitmproxy/src/json'
import log from './utils/util.log'

log.info(`background.js start, platform is ${process.platform}`)

const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'
const isMac = process.platform === 'darwin'

const isDevelopment = process.env.NODE_ENV !== 'production'

// 避免其他系统出现异常，只有 Windows 使用 './background/powerMonitor'
let _powerMonitor = powerMonitor
if (isWindows) {
  try {
    _powerMonitor = require('./background/powerMonitor').powerMonitor
  } catch (e) {
    log.error(`加载 './background/powerMonitor' 失败，现捕获异常并使用默认的 powerMonitor。\r\n目前，启动着DS重启电脑时，将无法正常关闭系统代理，届时请自行关闭系统代理！\r\n捕获的异常信息:`, e)
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let winIsHidden = false

let tray // 防止被内存清理
let forceClose = false

try {
  DevSidecar.api.config.reload()
} catch (e) {
  log.error('配置加载失败:', e)
}

let hideDockWhenWinClose = DevSidecar.api.config.get().app.dock.hideWhenWinClose || false
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
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
      click: switchDevTools,
    },
    {
      // 系统托盘图标目录
      label: '退出',
      click: () => {
        log.info('force quit')
        forceClose = true
        quit('系统托盘图标-退出')
      },
    },
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
      log.info('i am changed')
      if (nativeTheme.shouldUseDarkColors) {
        log.info('i am dark.')
        tray.setImage(iconWhitePath)
      } else {
        log.info('i am light.')
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

  appTray.on('right-click', () => {
    setTimeout(() => {
      appTray.popUpContextMenu(contextMenu)
    }, 200)
  })

  return appTray
}

function checkHideWin () {
  const config = DevSidecar.api.config.get()

  // 配置为false时，不需要校验
  if (!config.app.needCheckHideWindow) {
    return true
  }

  // 如果是linux，且没有设置快捷键，则提示先设置快捷键
  if (isLinux && !hasShortcut(config.app.showHideShortcut)) {
    dialog.showMessageBox({
      type: 'info',
      title: '提示：请先设置快捷键',
      message: '由于大部分 Linux 系统没有系统托盘，所以需使用快捷键呼出窗口。\n但您还未设置快捷键，请先到 “设置” 页面中设置好快捷键，再关闭窗口。',
      buttons: ['确定'],
    })
    return false
  }

  return true
}

function hideWin (reason = '', needCheck = false) {
  if (win) {
    if (needCheck && !checkHideWin()) {
      return
    }

    win.hide()
    if (isMac && hideDockWhenWinClose) {
      app.dock.hide()
    }
    winIsHidden = true
  } else {
    log.warn(`win is null, do not hide win, reason: ${reason}`)
  }
}

function showWin () {
  if (win) {
    win.show()
  } else {
    log.warn('win is null, do not show win')
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

function createWindow (startHideWindow, autoQuitIfError = true) {
  // Create the browser window.
  const windowSize = DevSidecar.api.config.get().app.windowSize || {}

  try {
    win = new BrowserWindow({
      width: windowSize.width || 900,
      height: windowSize.height || 750,
      title: 'DevSidecar',
      webPreferences: {
        enableRemoteModule: true,
        contextIsolation: false,
        nativeWindowOpen: true, // ADD THIS
        // Use pluginOptions.nodeIntegration, leave this alone
        // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
        nodeIntegration: true, // process.env.ELECTRON_NODE_INTEGRATION
      },
      show: !startHideWindow,
      icon: path.join(__static, 'icon.png'),
    })
  } catch (e) {
    log.error('创建窗口失败:', e)
    dialog.showErrorBox('错误', `创建窗口失败: ${e.message}`)
    if (autoQuitIfError) {
      quit('创建窗口失败')
    }
    return false
  }
  winIsHidden = !!startHideWindow

  Menu.setApplicationMenu(null)
  win.setMenu(null)

  // !!IMPORTANT
  if (isWindows && typeof _powerMonitor.setupMainWindow === 'function') {
    _powerMonitor.setupMainWindow(win)
  }

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
    hideWin('startHideWindow')
  }

  win.on('closed', async (...args) => {
    log.info('win closed:', ...args)
    win = null
    tray = null
  })

  ipcMain.on('close', async (event, message) => {
    if (message.value === 1) {
      quit('ipc receive "close"')
    } else {
      hideWin('ipc receive "close"', true)
    }
  })

  win.on('close', (e, ...args) => {
    log.info('win close:', e, ...args)
    if (forceClose) {
      return
    }
    e.preventDefault()
    const config = DevSidecar.api.config.get()
    const closeStrategy = config.app.closeStrategy
    if (closeStrategy === 1) {
      // 直接退出
      quit('win close')
    } else if (closeStrategy === 2) {
      // 隐藏窗口
      hideWin('win close', true)
    } else {
      // 弹窗提示，选择关闭策略
      win.webContents.send('close.showTip', { closeStrategy, showHideShortcut: config.app.showHideShortcut })
    }
  })

  win.on('session-end', async (e, ...args) => {
    log.info('win session-end:', e, ...args)
    await quit('win session-end')
  })

  const shortcut = (event, input) => {
    // 按 F12，打开/关闭 开发者工具
    if (input.key === 'F12') {
      // 阻止默认的按键事件行为
      event.preventDefault()
      // 切换开发者工具显示状态
      switchDevTools()
      // eslint-disable-next-line style/brace-style
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
  win.webContents.on('ipc-message', (event, channel, message, ...args) => {
    console.info('win ipc-message:', event, channel, message, ...args)

    // 记录日志
    if (channel && channel.startsWith('[ERROR]')) {
      log.error('win ipc-message:', channel.substring(7), message, ...args)
    } else {
      log.info('win ipc-message:', channel, message, ...args)
    }

    if (channel === 'change-showHideShortcut') {
      registerShowHideShortcut(message)
    }
  })

  return true
}

async function beforeQuit () {
  log.info('before quit')
  return DevSidecar.api.shutdown()
}
async function quit (reason) {
  log.info('app quit:', reason)

  if (tray) {
    tray.displayBalloon({ title: '正在关闭', content: '关闭中,请稍候。。。' })
  }
  await beforeQuit()
  forceClose = true
  app.quit()
}

function hasShortcut (showHideShortcut) {
  return showHideShortcut && showHideShortcut.length > 1
}

function registerShowHideShortcut (showHideShortcut) {
  globalShortcut.unregisterAll()
  if (hasShortcut(showHideShortcut)) {
    try {
      const registerSuccess = globalShortcut.register(DevSidecar.api.config.get().app.showHideShortcut, () => {
        if (winIsHidden) {
          showWin()
        } else {
          if (!win.isFocused()) {
            win.focus() // 如果窗口打开着，但没有获取焦点，则获取焦点，而不是hide
          } else {
            hideWin('shortcut')
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
try {
  app.disableHardwareAcceleration() // 禁用gpu

  // 开启后是否默认隐藏window
  let startHideWindow = !DevSidecar.api.config.get().app.startShowWindow
  if (app.getLoginItemSettings().wasOpenedAsHidden) {
    startHideWindow = true
  } else if (process.argv) {
    const args = minimist(process.argv)
    log.info('start args:', args)

    // 通过启动参数，判断是否隐藏窗口
    const hideWindowArg = `${args.hideWindow}`
    if (hideWindowArg === 'true' || hideWindowArg === '1') {
      startHideWindow = true
    } else if (hideWindowArg === 'false' || hideWindowArg === '0') {
      startHideWindow = false
    }
  }
  log.info('startHideWindow = ', startHideWindow, ', app.getLoginItemSettings() = ', jsonApi.stringify2(app.getLoginItemSettings()))

  // 禁止双开
  const isFirstInstance = app.requestSingleInstanceLock()
  if (!isFirstInstance) {
    log.info('app quit: is second instance')
    setTimeout(() => {
      app.quit()
    }, 1000)
  } else {
    app.on('before-quit', async () => {
      log.info('before-quit')
      if (process.platform === 'darwin') {
        quit('before quit')
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
        quit('window-all-closed')
      }
    })

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (win == null) {
        createWindow(false, false)
      } else {
        showWin()
      }
    })

    // initApp()

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', async () => {
      // if (isDevelopment && !process.env.IS_TEST) {
      //   // Install Vue Devtools
      //   try {
      //     await installExtension(VUEJS_DEVTOOLS)
      //   } catch (e) {
      //     log.error('Vue Devtools failed to install:', e.toString())
      //   }
      // }

      try {
        if (!createWindow(startHideWindow)) {
          return // 创建窗口失败，应用将关闭
        }
      } catch (err) {
        log.error('createWindow error:', err)
      }

      try {
        const context = { win, app, beforeQuit, quit, ipcMain, dialog, log, api: DevSidecar.api, changeAppConfig }
        backend.install(context) // 模块安装
      } catch (err) {
        log.error('install modules error:', err)
      }

      try {
        // 最小化到托盘
        tray = setTray()
      } catch (err) {
        log.error('setTray error:', err)
      }

      _powerMonitor.on('shutdown', async (e) => {
        if (e) {
          e.preventDefault()
        }
        log.info('系统关机，恢复代理设置')
        await quit('系统关机')
      })
    })
  }

  initApp()

  // Exit cleanly on request from parent process in development mode.
  if (isDevelopment) {
    if (process.platform === 'win32') {
      process.on('message', (data) => {
        if (data === 'graceful-exit') {
          quit('graceful-exit')
        }
      })
    } else {
      process.on('SIGINT', () => {
        quit('SIGINT')
      })
    }
  }
  // 系统关机和重启时的操作
  process.on('exit', () => {
    quit('进程结束，退出app')
  })

  log.info('background.js finished')
} catch (e) {
  log.error('应用启动过程中，出现未知异常：', e)
}
