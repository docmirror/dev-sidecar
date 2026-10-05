'use strict'
import './utils/util.log-env.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import DevSidecar from '@blue-frontier/dev-sidecar'
import electron from './electron.js'
const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, powerMonitor, Tray } = electron
import fs from 'node:fs'
import minimist from 'minimist'
import backend from './bridge/backend.js'
import jsonApi from '@blue-frontier/mitmproxy/src/json.js'
import log from './utils/util.log.gui.js'
import { TRAY_PLUGINS, TRAY_ACTIONS } from './generated/tray-plugins.js'
import { VERSION_3_FEATURE_ENABLED } from './version-3-feature.js'

log.info(`background.js start, platform is ${process.platform}`)

const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'
const isMac = process.platform === 'darwin'

if (isWindows) {
  // 让 Windows 托盘气泡/通知/任务栏显示正常软件名，而不是开发模式默认的 electron.app
  app.setName('dev-sidecar')
  app.setAppUserModelId('dev-sidecar')
}

// 禁用不需要的 Chromium 组件以减少内存和 CPU 占用
// 这些开关必须在 app.whenReady() 之前设置

// ── 渲染器 / 进程限制 ──
app.commandLine.appendSwitch('renderer-process-limit', '1') // 单个渲染器进程（默认是每个 CPU 核心一个）

// ── 证书 / 网络 ──
app.commandLine.appendSwitch('use-system-ca') // 使用系统证书库，信任 dev-sidecar 自签 CA

// ── 功能开关 ──
app.commandLine.appendSwitch('disable-pdf-viewer') // PDF 查看器
app.commandLine.appendSwitch('disable-print-preview') // 打印预览
app.commandLine.appendSwitch('disable-speech-api') // 语音识别/合成
app.commandLine.appendSwitch('disable-gpu-rasterization') // GPU 光栅化
app.commandLine.appendSwitch('disable-accelerated-video-decode') // 硬件视频解码
app.commandLine.appendSwitch('disable-background-networking') // 后台网络活动（同步/遥测）
app.commandLine.appendSwitch('disable-sync') // Chrome 同步服务
app.commandLine.appendSwitch('disable-default-apps') // 默认应用注册
app.commandLine.appendSwitch('disable-component-update') // 组件自动更新
app.commandLine.appendSwitch('disable-client-side-phishing-detection') // 钓鱼检测
app.commandLine.appendSwitch('disable-domain-reliability') // 域名可靠性监控

// ── 通过 --disable-features 禁用的 Chromium Feature 列表 ──
app.commandLine.appendSwitch('disable-features', [
  'MediaRouter', // 投屏 / 媒体路由
  'WebRTC', // 实时通信（视频/音频通话）
  'SensorAPI', // 传感器 API（陀螺仪/加速度计等）
  'GamepadAPI', // 游戏手柄 API
  'ColorCorrectRendering', // 显示颜色校正
  'SerializeBackingStores', // 页面内容序列化到磁盘缓存
  'CrashReporting', // Chromium 崩溃报告（已有自身日志）
  'TranslateUI', // 翻译 UI
  'AutofillServerCommunication', // 自动填充服务器通信
  'SafeBrowsing', // 安全浏览（URL 黑名单检查）
  'NotificationTriggers', // 定时通知
  'WebPayments', // 支付请求 API
  'BackgroundFetch', // 后台下载
].join(','))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDevelopment = process.env.NODE_ENV !== 'production'

let _powerMonitor = powerMonitor

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
function readUserSetting () {
  try {
    const userBase = process.env.USERPROFILE || process.env.HOME || '/'
    const dir = path.join(userBase, '.dev-sidecar')
    const p = path.join(dir, 'setting.json')
    if (!fs.existsSync(p)) {
      return {}
    }
    return jsonApi.parse(fs.readFileSync(p, 'utf-8')) || {}
  } catch {
    return {}
  }
}

// 托盘可见插件：由 scripts/gen-tray-plugins.mjs 打包期扫描生成（见 src/generated/tray-plugins.js）
// 【临时方案】尚未实现动态插件，表在打包期固定；动态插件落地后应改为运行时读插件注册表
// needUnlock：仅在 setting.json 的 overwall 解锁后显示（与首页一致）
// restartServer：切换后若代理服务在运行则重启
function getMitmproxyPath () {
  return path.join(__dirname, 'bridge', 'mitmproxy.js')
}

function isOverwallUnlocked () {
  return readUserSetting().overwall === true
}

function getVisibleTrayPlugins () {
  const unlocked = isOverwallUnlocked()
  return TRAY_PLUGINS.filter((p) => {
    // P2P 暂未发布，见 src/version-3-feature.js
    if (p.key === 'share' && !VERSION_3_FEATURE_ENABLED) {
      return false
    }
    return !p.needUnlock || unlocked
  })
}

/** 一键动作（如网络检测）：调用插件 run()，不改 enabled 勾选 */
async function runTrayAction (key, name) {
  try {
    log.info(`托盘一键动作: ${name} (${key})`)
    const api = DevSidecar.api.plugin[key]
    if (!api) {
      log.error(`插件【${key}】不可用`)
      return
    }
    if (typeof api.run === 'function') {
      await api.run()
    } else if (typeof api.start === 'function') {
      await api.start()
    } else {
      log.error(`插件【${key}】没有可调用的 run/start`)
    }
  } catch (e) {
    log.error(`托盘一键动作失败: ${name} (${key})`, e)
  }
}

async function toggleTraySwitch (key, checked) {
  try {
    const setting = readUserSetting()
    if (key === 'proxy') {
      if (checked) {
        await DevSidecar.api.proxy.start()
      } else {
        await DevSidecar.api.proxy.close()
      }
      const config = DevSidecar.api.config.get()
      config.proxy.enabled = checked
      await DevSidecar.api.config.save(config)
    } else if (key === 'server') {
      if (checked) {
        await DevSidecar.api.server.start({ mitmproxyPath: getMitmproxyPath(), setting })
      } else {
        await DevSidecar.api.server.close()
      }
      const config = DevSidecar.api.config.get()
      config.server.enabled = checked
      await DevSidecar.api.config.save(config)
    } else {
      const api = DevSidecar.api.plugin[key]
      if (!api) {
        return
      }
      if (checked) {
        await api.start()
      } else {
        await api.close()
      }
      const config = DevSidecar.api.config.get()
      const pluginConf = config.plugin && config.plugin[key]
      if (pluginConf) {
        pluginConf.enabled = checked
        // 与首页模式选择同步：增强功能 = 增强模式
        if (key === 'overwall') {
          if (checked) {
            config.app.mode = 'ow'
            if (config.server) {
              config.server.intercept.enabled = true
            }
          } else if (config.app?.mode === 'ow') {
            config.app.mode = 'default'
            if (config.server) {
              config.server.intercept.enabled = true
              if (config.server.dns?.speedTest) {
                config.server.dns.speedTest.enabled = true
              }
            }
          }
        }
        await DevSidecar.api.config.save(config)
        const def = TRAY_PLUGINS.find(p => p.key === key)
        if (def?.restartServer && DevSidecar.api.status.get().server?.enabled) {
          await DevSidecar.api.server.restart({ mitmproxyPath: getMitmproxyPath(), setting })
        }
      }
    }
  } catch (e) {
    log.error('托盘开关切换失败:', key, e)
  }
}

function setTray () {
  // 用一个 Tray 来表示一个图标,这个图标处于正在运行的系统的通知区
  // 通常被添加到一个 context menu 上.
  // 设置系统托盘图标
  // 生产模式下 extra 在 resources/extra/（asar 外），开发模式下在项目根目录的 extra/
  const appPath = app.getAppPath()
  let iconRootPath = path.join(appPath, 'extra', 'icons', 'tray')
  if (!fs.existsSync(path.join(iconRootPath, 'icon.png'))) {
    // extra 在 asar 外，需要从 asar 路径向上一级
    iconRootPath = path.join(path.dirname(appPath), 'extra', 'icons', 'tray')
  }
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

  // 托盘右键菜单：结构固定，仅同步勾选状态
  const checkables = { server: null, proxy: null, plugins: {} }
  let trayMenuCache = null

  const buildTrayMenu = () => {
    const visible = getVisibleTrayPlugins()
    const items = [
      { label: '显示主窗口', click: showWin },
      { type: 'separator' },
    ]

    const serverItem = { label: '代理服务', type: 'checkbox', click: menuItem => toggleTraySwitch('server', menuItem.checked) }
    const proxyItem = { label: '系统代理', type: 'checkbox', click: menuItem => toggleTraySwitch('proxy', menuItem.checked) }
    items.push(serverItem, proxyItem)

    checkables.plugins = {}
    if (visible.length > 0) {
      items.push({ type: 'separator' })
      for (const def of visible) {
        items.push({
          label: def.name,
          type: 'checkbox',
          click: menuItem => toggleTraySwitch(def.key, menuItem.checked),
        })
      }
    }

    // 一键动作菜单（如网络检测）：非 checkbox，点了就跑
    const actions = (TRAY_ACTIONS || []).filter(a => a && a.key)
    if (actions.length > 0) {
      items.push({ type: 'separator' })
      for (const def of actions) {
        items.push({
          label: `运行${def.name}`,
          click: () => runTrayAction(def.key, def.name),
        })
      }
    }

    items.push(
      { type: 'separator' },
      { label: 'DevTools (F12)', click: switchDevTools },
      {
        label: '退出',
        click: () => {
          log.info('force quit')
          forceClose = true
          quit('系统托盘图标-退出')
        },
      },
    )

    const menu = Menu.buildFromTemplate(items)
    // 记录勾选项，后续只改 checked，不重建菜单
    checkables.server = menu.items.find(i => i.label === '代理服务')
    checkables.proxy = menu.items.find(i => i.label === '系统代理')
    for (const def of visible) {
      checkables.plugins[def.key] = menu.items.find(i => i.label === def.name)
    }
    return menu
  }

  const syncTrayChecked = () => {
    try {
      const status = DevSidecar.api.status.get()
      if (checkables.server) {
        checkables.server.checked = !!(status.server && status.server.enabled)
      }
      if (checkables.proxy) {
        checkables.proxy.checked = !!(status.proxy && status.proxy.enabled)
      }
      for (const [key, item] of Object.entries(checkables.plugins)) {
        if (item) {
          item.checked = !!(status.plugin && status.plugin[key] && status.plugin[key].enabled)
        }
      }
      // Linux 需重新 setContextMenu 才能让勾选变化被桌面环境感知
      if (isLinux && trayMenuCache) {
        appTray.setContextMenu(trayMenuCache)
      }
    } catch (e) {
      log.error('同步托盘勾选状态失败:', e)
    }
  }

  trayMenuCache = buildTrayMenu()
  syncTrayChecked()

  // 仅在增强模式解锁变化时重建菜单结构（插件可见性变了）
  let lastUnlocked = isOverwallUnlocked()
  const ensureTrayMenuStructure = () => {
    const unlocked = isOverwallUnlocked()
    if (unlocked !== lastUnlocked) {
      lastUnlocked = unlocked
      trayMenuCache = buildTrayMenu()
      syncTrayChecked()
      if (isLinux) {
        appTray.setContextMenu(trayMenuCache)
      }
    }
  }

  // 设置托盘悬浮提示
  appTray.setToolTip('DevSidecar-开发者边车辅助工具')
  // 单击托盘小图标显示应用
  appTray.on('click', () => {
    showWin()
  })

  // 状态变化：只同步勾选；结构变化（解锁）才重建
  try {
    DevSidecar.api.event.register('status', () => {
      ensureTrayMenuStructure()
      syncTrayChecked()
    })
  } catch (e) {
    log.error('注册托盘状态刷新失败:', e)
  }

  if (isLinux) {
    // Linux（StatusNotifierItem / dbusmenu）必须 setContextMenu 才能导出菜单；
    // popUpContextMenu 仅支持 macOS/Windows，在 Linux 上是静默 no-op
    appTray.setContextMenu(trayMenuCache)
  } else {
    appTray.on('right-click', () => {
      ensureTrayMenuStructure()
      syncTrayChecked()
      setTimeout(() => {
        appTray.popUpContextMenu(trayMenuCache)
      }, 200)
    })
  }

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

function loadAppIcon () {
  const candidates = []

  // Windows 下优先使用 exe 同款 ico，任务栏图标更清晰
  if (isWindows) {
    candidates.push(path.join(process.resourcesPath, 'extra', 'icons', 'icon.ico'))
  }
  // 优先：从 asar 内读取
  candidates.push(path.join(app.getAppPath(), 'dist', 'icon.png'))
  // 回退：asar.unpacked 真实路径
  candidates.push(path.join(app.getAppPath(), '..', 'app.asar.unpacked', 'dist', 'icon.png'))
  // 再回退：extra 资源目录
  candidates.push(path.join(process.resourcesPath, 'extra', 'icons', '512x512.png'))
  // 开发模式回退
  candidates.push(path.resolve('public/icon.png'))

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        return nativeImage.createFromPath(p)
      }
    } catch { /* ignore */ }
  }

  return nativeImage.createEmpty()
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
      icon: loadAppIcon(),
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
    // 默认不自动打开 DevTools，需要调试时可手动按 F12 或通过托盘菜单打开
  } else {
    // Load the index.html when not in development
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
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
    if (input.key === 'F12' && input.type === 'keyUp' && !input.control && !input.shift && !input.alt && !input.meta) {
      // 按 F12，打开/关闭 开发者工具
      event.preventDefault()
      switchDevTools()
    } else if (input.key === 'F5' && input.type === 'keyUp' && !input.control && !input.shift && !input.alt && !input.meta) {
      // 按 F5，刷新页面
      event.preventDefault()
      win.webContents.reload()
    } else {
      // 全文检索框（SearchBar）相关快捷键
      if ((input.key === 'F' || input.key === 'f') && input.type === 'keyDown' && input.control && !input.shift && !input.alt && !input.meta) {
        // 按 Ctrl + F，显示或隐藏全文检索框（SearchBar）
        event.preventDefault()
        win.webContents.send('search-bar', { key: 'show-hide' })
      } else if (input.key === 'Escape' && input.type === 'keyUp' && !input.control && !input.shift && !input.alt && !input.meta) {
        // 按 ESC，隐藏全文检索框（SearchBar）
        event.preventDefault()
        win.webContents.send('search-bar', { key: 'hide' })
      } else if (input.key === 'F3' && input.type === 'keyDown' && !input.control && !input.shift && !input.alt && !input.meta) {
        // 按 F3，全文检索框（SearchBar）定位到下一个
        event.preventDefault()
        win.webContents.send('search-bar', { key: 'next' })
      } else if (input.key === 'F3' && input.type === 'keyDown' && !input.control && input.shift && !input.alt && !input.meta) {
        // 按 Shift + F3，全文检索框（SearchBar）定位到上一个
        event.preventDefault()
        win.webContents.send('search-bar', { key: 'previous' })
      }
    }
  }

  // 监听键盘事件
  win.webContents.on('before-input-event', (event, input) => {
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

function normalizeBooleanArg (value) {
  const text = `${value}`.replace(/^["']+|["']+$/g, '').trim().toLowerCase()
  if (text === 'true' || text === '1') {
    return true
  }
  if (text === 'false' || text === '0') {
    return false
  }
  return null
}

function parseHideWindowArg (argv) {
  const list = argv || []
  for (let i = 0; i < list.length; i++) {
    const match = /^--hide-?window(?:=(.*))?$/i.exec(String(list[i]))
    if (!match) {
      continue
    }
    if (match[1] != null && match[1] !== '') {
      return normalizeBooleanArg(match[1])
    }
    const next = list[i + 1]
    if (next != null && !String(next).startsWith('-')) {
      return normalizeBooleanArg(next)
    }
    return true
  }
  return null
}

function initApp () {
  if (isMac) {
    app.whenReady().then(() => {
      const appPath = app.getAppPath()
      let iconPath = path.join(appPath, 'extra', 'icons', '512x512-2.png')
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(path.dirname(appPath), 'extra', 'icons', '512x512-2.png')
      }
      app.dock.setIcon(iconPath)
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

    // 兼容旧自启参数的引号，并支持 `--hideWindow=true`。
    const hideWindowArg = parseHideWindowArg(process.argv)
    if (hideWindowArg != null) {
      startHideWindow = hideWindowArg
    }
  }
  log.info('startHideWindow = ', startHideWindow, ', app.getLoginItemSettings() = ', jsonApi.stringify2(app.getLoginItemSettings()))

  // 禁止双开
  const isFirstInstance = app.requestSingleInstanceLock()
  if (!isFirstInstance) {
    log.info('app quit: is second instance（禁止双开）')
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
        if (parseHideWindowArg(commandLine) === true) {
          log.info('second instance requested hidden startup; keep window hidden')
          return
        }
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
      // 获取实例锁，防止 CLI/GUI 重复运行
      try {
        await DevSidecar.api.instance.acquireLock({ log })
        try {
          DevSidecar.api.instance.writeInstance({
            type: 'gui',
            pid: process.pid,
            command: process.argv.join(' '),
            startTime: new Date().toISOString(),
          })
        } catch (e) {
          log.error('写入 running.json 实例信息失败:', e)
        }
      } catch (e) {
        log.error('另一个 dev-sidecar 实例正在运行，GUI 启动失败:', e.message)
        app.quit()
        return
      }

      if (isWindows) {
        try {
          const mod = await import('./background/powerMonitor.js')
          _powerMonitor = mod.powerMonitor
        } catch (e) {
          log.error(`加载 './background/powerMonitor' 失败，现捕获异常并使用默认的 powerMonitor。\r\n目前，启动着DS重启电脑时，将无法正常关闭系统代理，届时请自行关闭系统代理！\r\n捕获的异常信息:`, e)
        }
      }

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
