import fs from 'node:fs'
import path from 'node:path'
import tls from 'node:tls'
import { fileURLToPath } from 'node:url'
import DevSidecar from '@blue-frontier/dev-sidecar'
import AdmZip from 'adm-zip'
import electron from '../../electron.js'
const { ipcMain, net, session } = electron
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
import request from 'request'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const pkg = require('../../../package.json')
import appPathUtil from '../../utils/util.apppath.js'
import log from '../../utils/util.log.gui.js'
import { isNewVersion } from '@blue-frontier/dev-sidecar/src/utils/util.version.js'
import sudoPrompt from '@vscode/sudo-prompt'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWindows = process.platform === 'win32'

const curVersion = pkg.version
const isCurrentPreRelease = curVersion.includes('-')

let cachedRootCaCert = null
/**
 * 更新检查/下载会走本地 MITM 代理，需要信任 dev-sidecar 自己的根证书；
 * 同时也保留 Node 内置根证书，保证直连 GitHub 时也能正常校验。
 */
function getTrustedCaList () {
  const caList = [...tls.rootCertificates]
  if (cachedRootCaCert != null) {
    if (cachedRootCaCert !== false) {
      caList.push(cachedRootCaCert)
    }
    return caList
  }

  try {
    const certPath = DevSidecar.api?.config?.get()?.server?.setting?.rootCaFile?.certPath
    if (certPath && fs.existsSync(certPath)) {
      cachedRootCaCert = fs.readFileSync(certPath, 'utf8')
      caList.push(cachedRootCaCert)
    } else {
      cachedRootCaCert = false
    }
  } catch (e) {
    log.warn('读取 dev-sidecar 根证书失败:', e)
    cachedRootCaCert = false
  }
  return caList
}

/**
 * 获取当前平台/架构对应的资源命名。
 * - partArch: 增量包命名用（<platform>-<arch>，如 win-x64 / mac-arm64 / linux-armv7l）
 * - fullArch: 完整安装包命名用（windows-x86_64 / macos-arm64 / linux-armv7l 等）
 */
function safeHostname (uri) {
  try {
    return new URL(uri).hostname
  } catch {
    return 'api.github.com'
  }
}

function getLocalProxyUrl () {
  const config = DevSidecar.api.config.get()
  const server = config.server || {}
  if (!server.port) {
    return null
  }
  const host = !server.host || server.host === '0.0.0.0' ? '127.0.0.1' : server.host
  return `http://${host}:${server.port}`
}

function normalizeProxyUrl (url) {
  return String(url || '').trim().replace(/\/+$/, '').toLowerCase()
}

/**
 * 解析更新请求使用的代理。
 *
 * - DS 代理已开启：使用它实际的 host/port，不硬编码端口；
 * - DS 代理未开启：允许用户自己设置的外部代理（环境变量），否则直接返回错误；
 * - 环境变量指向的正是 DS 自己的代理地址、但代理未开启时，说明这是残留配置，按“代理未开启”处理；
 * - 任何情况下都不在代理不可用时尝试直连，避免在受限网络里得到误导性的“检查更新失败”。
 *
 * @returns {{ url: string|null, error?: string }}
 */
function resolveUpdateProxy () {
  const serverEnabled = DevSidecar.api.status.get().server?.enabled === true
  const localUrl = getLocalProxyUrl()

  if (serverEnabled) {
    if (localUrl) {
      return { url: localUrl }
    }
    return { url: null, error: '代理未开启：未取到代理端口，请先在首页开启加速服务后再检查更新' }
  }

  const envProxy = process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy
  if (envProxy) {
    // 核心在开启系统代理时会把自己的地址写入环境变量；代理关闭后这些变量可能仍然存在，
    // 不能把它们当成“用户自己的外部代理”去重试。
    if (localUrl && normalizeProxyUrl(envProxy) === normalizeProxyUrl(localUrl)) {
      return { url: null, error: '代理未开启，请先在首页开启加速服务后再检查更新' }
    }
    return { url: envProxy }
  }

  return { url: null, error: '代理未开启，请先在首页开启加速服务后再检查更新' }
}

function getPlatformAssetInfo () {
  const arch = process.arch
  let partArch
  let fullArch
  if (arch === 'ia32') {
    partArch = 'ia32'
    fullArch = 'ia32'
  } else if (arch === 'arm64') {
    partArch = 'arm64'
    fullArch = 'arm64'
  } else if (arch === 'arm') {
    // Linux armv7l：CI 已产出 update-linux-armv7l 增量包
    partArch = 'armv7l'
    fullArch = 'armv7l'
  } else {
    partArch = 'x64'
    fullArch = 'x86_64'
  }

  if (isMac) {
    return { platform: 'macos', partPlatform: 'mac', partArch, fullArch: arch === 'arm64' ? 'arm64' : 'x64' }
  }
  if (isLinux) {
    return { platform: 'linux', partPlatform: 'linux', partArch, fullArch }
  }
  return { platform: 'windows', partPlatform: 'win', partArch, fullArch }
}

function extractVersion (versionData) {
  const candidates = [versionData.tag_name, versionData.name]
  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }
    const matched = candidate.match(/^v?(\d+(?:\.\d+)+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/)
    if (matched) {
      return matched[0].startsWith('v') ? matched[0].substring(1) : matched[0]
    }
  }
  return null
}

function getUpdateDownloadDir (app) {
  // 安装目录（Program Files / .app 内）可能只读，下载到 userData/update
  const userData = app.getPath('userData')
  const fileDir = path.join(userData, 'update')
  fs.mkdirSync(fileDir, { recursive: true })
  return fileDir
}

function downloadFile (uri, filePath, onProgress, onSuccess, onError) {
  log.info('download url', uri)
  const proxy = resolveUpdateProxy()
  if (proxy.error) {
    log.warn('跳过下载升级包：', proxy.error)
    onError(new Error(proxy.error))
    return
  }
  const tempPath = `${filePath}.download`
  try {
    fs.rmSync(tempPath, { force: true })
  } catch (e) {
    onError(e)
    return
  }
  const writeStream = fs.createWriteStream(tempPath)
  let settled = false
  let currentRequest = null
  let idleTimer = null

  const fail = (err) => {
    if (settled) {
      return
    }
    settled = true
    if (idleTimer) {
      clearTimeout(idleTimer)
    }
    try {
      currentRequest?.abort()
    } catch {
      // ignore
    }
    writeStream.destroy()
    try {
      fs.rmSync(tempPath, { force: true })
    } catch (cleanupError) {
      log.warn('清理失败的升级包失败:', cleanupError)
    }
    log.error('下载升级包失败:', err)
    onError(err)
  }

  const armIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
    }
    idleTimer = setTimeout(() => fail(new Error('下载升级包超时（60 秒无数据）')), 60000)
  }

  const finish = () => {
    if (settled) {
      return
    }
    try {
      fs.rmSync(filePath, { force: true })
      fs.renameSync(tempPath, filePath)
    } catch (e) {
      fail(e)
      return
    }
    settled = true
    if (idleTimer) {
      clearTimeout(idleTimer)
    }
    onSuccess(filePath)
  }

  writeStream.on('error', fail)
  writeStream.on('finish', finish)

  // 用 Electron 的网络栈下载：GitHub 资产会 302 到 release-assets.githubusercontent.com，
  // request 库经本地代理跟随这种跨域重定向时会挂起（2.3.3 之前自动更新卡 0 字节的原因）。
  ;(async () => {
    try {
      const ses = session.fromPartition('update-download')
      if (proxy.url) {
        await ses.setProxy({ proxyRules: proxy.url })
      }
      const req = net.request({ url: uri, session: ses, redirect: 'follow' })
      currentRequest = req
      armIdleTimer()
      req.on('response', (response) => {
        if (settled) {
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const hint = response.statusCode === 404 ? '（发布未公开或资产不存在）' : ''
          fail(new Error(`下载升级包失败，HTTP status: ${response.statusCode}${hint}`))
          return
        }
        const total = Number(response.headers['content-length'] || 0)
        let received = 0
        response.on('data', (chunk) => {
          if (settled) {
            return
          }
          armIdleTimer()
          received += chunk.length
          writeStream.write(chunk)
          if (total > 0) {
            onProgress(Math.min(100, received / total * 100))
          }
        })
        response.on('end', () => {
          if (!settled) {
            writeStream.end()
          }
        })
        response.on('aborted', () => fail(new Error('下载连接中断')))
        response.on('error', fail)
      })
      req.on('error', fail)
      req.end()
    } catch (e) {
      fail(e)
    }
  })()
}

/**
 * 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
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
    updateNotAva: '当前为最新版本，无需更新',
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
  // 只取最近 10 个版本：全量 releases 有 900KB 左右，列表足够判断最新版，且能显著缩短检查时间
  const releasesApiUrl = 'https://api.github.com/repos/docmirror/dev-sidecar/releases?per_page=10'
  async function checkForUpdatesFromGitHub () {
    const proxy = resolveUpdateProxy()
    if (proxy.error) {
      log.warn('跳过检查更新：', proxy.error)
      win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: proxy.error })
      return
    }

    // request 自带的 timeout 只覆盖建连后的 socket 空闲，代理 CONNECT 阶段卡住时不会触发，
    // 所以这里再加一个看门狗主动 abort，避免界面一直停在“检查更新中”。
    let timedOut = false
    let requestHandle
    const timer = setTimeout(() => {
      timedOut = true
      log.warn('检查更新超时（15 秒），已中止请求')
      try {
        requestHandle?.abort()
      } catch {
        // 已经结束的请求无需处理
      }
      win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新超时（15 秒），请检查网络或系统代理后重试' })
    }, 15000)

    requestHandle = request(releasesApiUrl, {
      headers: { 'User-Agent': `DS/${curVersion}`, 'Server-Name': 'baidu.com' },
      ca: getTrustedCaList(),
      proxy: proxy.url,
      timeout: 15000,
      // GitHub 的 releases 响应未压缩时接近 1MB，开 gzip 后约 100KB
      gzip: true,
    }, (error, response, body) => {
      if (timedOut) {
        return
      }
      clearTimeout(timer)
      try {
        if (error) {
          log.error('检查更新失败:', error)
          const isTimeout = error.code === 'ETIMEDOUT' || /timeout/i.test(String(error.message || ''))
          const proxyUnavailable = /ECONNREFUSED|tunneling socket could not be established|ECONNRESET/i.test(String(error.message || ''))
            || error.code === 'ECONNREFUSED'
          // 代理/MITM 返回了非 HTTP 数据时，Node 的 HTTP 解析器会抛 Parse Error
          const parseError = /Parse Error|HPE_INVALID|invalid response/i.test(String(error.message || ''))
          let errorMsg
          if (proxyUnavailable) {
            errorMsg = '代理未开启或未就绪，请先在首页开启加速服务后重试'
          } else if (parseError) {
            errorMsg = '检查更新失败：代理返回了异常响应，请关闭再重新开启加速服务后重试'
          } else if (isTimeout) {
            errorMsg = '检查更新超时（15 秒），请检查网络或系统代理后重试'
          } else {
            errorMsg = `检查更新失败：${error}`
          }
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
          } catch {
            log.error('检查更新失败，github API返回数据格式不正确:', body)
            win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败，github API返回数据格式不正确' })
            return
          }

          if (typeof data !== 'object' || data.length === undefined) {
            log.error('检查更新失败，github API返回数据不是数组:', body)
            win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: '检查更新失败，github API返回数据不是数组' })
            return
          }

          // 序列化近 1MB 的 JSON 只为调试日志，非 debug 级别时不做
          const debugEnabled = typeof log.isLevelEnabled === 'function' ? log.isLevelEnabled('debug') : true
          if (debugEnabled) {
            log.debug('github api返回的release数据：', JSON.stringify(data, null, '\t'))
          }

          // 检查更新
          for (let i = 0; i < data.length; i++) {
            const versionData = data[i]

            // log.debug('版本数据：', versionData)

            if (!versionData.assets || versionData.assets.length === 0) {
              log.info('跳过空版本，即未上传过安装包：', versionData.name)
              continue // 跳过空版本，即未上传过安装包
            }
            const onlineVersion = extractVersion(versionData)
            if (!onlineVersion) {
              log.info('跳过无法提取版本号的版本:', versionData.name || versionData.tag_name)
              continue // 跳过即 “不是正式，又不是预发布” 的版本
            }

            const isOnlinePreRelease = onlineVersion.includes('-') || versionData.prerelease
            if (!isCurrentPreRelease && DevSidecar.api.config.get().app.skipPreRelease && isOnlinePreRelease) {
              log.info('跳过预发布版本:', versionData.name, ', onlineVersion:', onlineVersion)
              continue // 跳过预发布版本
            }

            log.info('最近可用版本：', versionData.name, ', onlineVersion:', onlineVersion)

            // 比对版本号，是否为新版本
            const isNew = isNewVersion(onlineVersion, curVersion, log)
            log.info(`版本比对结果：isNewVersion('${onlineVersion}', '${curVersion}') = ${isNew}`)
            if (isNew > 0) {
              log.info(`检查更新：发现新版本 '${onlineVersion}'，当前版本号为 '${curVersion}'`)

              // 查找当前平台+架构对应的增量更新包
              const assetInfo = getPlatformAssetInfo()
              let partPackage = null
              if (assetInfo.partArch) {
                const partPrefix = `update-${assetInfo.partPlatform}-${assetInfo.partArch}-`
                const partAsset = versionData.assets.find(a => a.name && a.name.startsWith(partPrefix) && a.name.endsWith('.zip'))
                partPackage = partAsset ? partAsset.browser_download_url : null
              }

              // 查找当前平台+架构对应的完整安装包
              const fullPrefix = assetInfo.platform === 'macos'
                ? `DevSidecar-${onlineVersion}-${assetInfo.fullArch}.`
                : `DevSidecar-${onlineVersion}-${assetInfo.platform}-${assetInfo.fullArch}.`
              const fullSuffix = assetInfo.platform === 'windows' ? '.exe' : assetInfo.platform === 'macos' ? '.dmg' : '.AppImage'
              const fullAsset = versionData.assets.find(a => a.name && a.name.startsWith(fullPrefix) && a.name.endsWith(fullSuffix))
              const fullPackage = fullAsset ? fullAsset.browser_download_url : null
              const fullPackageName = fullAsset ? fullAsset.name : null

              log.info(`平台资源匹配: ${JSON.stringify({ assetInfo, partPackage, fullPackageName })}`)

              win.webContents.send('update', {
                key: 'available',
                value: {
                  version: onlineVersion,
                  releaseNotes: versionData.body
                    ? (versionData.body.replace(/\r\n/g, '\n').replace(/https:\/\/github.com\/docmirror\/dev-sidecar/g, '').replace(/(?<=(^|\n))[ \t]*(?:#[ #]*)?#\s*/g, '') || '无')
                    : '无',
                  partPackage,
                  fullPackage,
                  fullPackageName,
                },
              })
            } else {
              log.info(`检查更新：没有新版本，最近发布的版本号为 '${onlineVersion}'，而当前版本号为 '${curVersion}'`)
              win.webContents.send('update', { key: 'notAvailable' })
            }

            return // 只检查最近一个版本
          }

          log.info('检查更新-没有正式版本数据')
          win.webContents.send('update', { key: 'notAvailable' })
        } else {
          log.error('检查更新失败, status:', response.statusCode, ', body:', body)

          let bodyObj
          try {
            bodyObj = JSON.parse(body)
          } catch {
            bodyObj = null
          }

          // GitHub 未登录请求按出口 IP 限流（每小时 60 次），命中时直接给出可读提示
          if (response.statusCode === 403 || response.statusCode === 429) {
            const limited = bodyObj && typeof bodyObj.message === 'string' && /rate limit/i.test(bodyObj.message)
            win.webContents.send('update', {
              key: 'error',
              action: 'checkForUpdate',
              error: limited
                ? '检查更新失败：GitHub API 请求频率超限，请稍后再试'
                : `检查更新失败：GitHub 拒绝了请求（HTTP ${response.statusCode}）`,
            })
            return
          }

          let detail = bodyObj && bodyObj.message ? bodyObj.message : ''
          if (!detail) {
            // 尝试从 DS 的 HTML 错误页面提取错误描述
            const titleMatch = typeof body === 'string' && body.match(/<title>([^<]*)<\/title>/i)
            if (titleMatch) {
              detail = titleMatch[1]
            } else if (response && response.statusMessage) {
              detail = response.statusMessage
            } else if (typeof body === 'string') {
              detail = body.substring(0, 200)
            }
          }
          let message
          if (response) {
            message = `检查更新失败: ${detail}, code: ${response.statusCode}`
          } else {
            message = `检查更新失败: ${detail || body}`
          }
          win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: message })
        }
      } catch (e) {
        log.error('检查更新失败:', e)
        win.webContents.send('update', { key: 'error', action: 'checkForUpdate', error: `检查更新失败:${e.message}` })
      }
    })
  }

  // 下载升级包
  function downloadPart (app, value) {
    const fileDir = getUpdateDownloadDir(app)
    log.info('download dir:', fileDir)
    const filePath = path.join(fileDir, `${value.version}.zip`)

    downloadFile(value.partPackage, filePath, (data) => {
      win.webContents.send('update', { key: 'progress', value: Number.parseInt(data) })
    }, (downloadedPath) => {
      // 文件下载完成
      win.webContents.send('update', { key: 'progress', value: 100 })
      log.info('升级包下载成功：', downloadedPath)
      partPackagePath = downloadedPath
      win.webContents.send('update', {
        key: 'downloaded',
        value,
        filePath: downloadedPath,
        updateType: 'part',
      })
    }, (error) => {
      sendUpdateMessage({ key: 'error', value: error, error })
    })
  }

  // 下载完整安装包（按平台+架构自动匹配后的安装文件）
  function downloadFull (app, value) {
    if (!value.fullPackage) {
      sendUpdateMessage({ key: 'error', value: new Error('未找到对应的完整安装包'), error: '未找到对应的完整安装包' })
      return
    }
    const fileDir = getUpdateDownloadDir(app)
    log.info('download full dir:', fileDir)
    // 文件名来自 renderer/更新元数据，必须限制在 update 目录内，防止 path traversal
    const rawName = value.fullPackageName || `${value.version}-${getPlatformAssetInfo().platform}-${getPlatformAssetInfo().fullArch}`
    const fileName = path.basename(String(rawName))
    const filePath = path.join(fileDir, fileName)
    if (!filePath.startsWith(fileDir + path.sep)) {
      sendUpdateMessage({ key: 'error', value: new Error('非法的安装包文件名'), error: '非法的安装包文件名' })
      return
    }

    downloadFile(value.fullPackage, filePath, (data) => {
      win.webContents.send('update', { key: 'progress', value: Number.parseInt(data) })
    }, (downloadedPath) => {
      win.webContents.send('update', { key: 'progress', value: 100 })
      log.info('完整安装包下载成功：', downloadedPath)
      win.webContents.send('update', {
        key: 'downloaded',
        value,
        filePath: downloadedPath,
        updateType: 'full',
      })
    }, (error) => {
      sendUpdateMessage({ key: 'error', value: error, error })
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

    if (!canWrite(target)) {
      if (isWindows) {
        // Windows 安装在 Program Files 时普通权限写不进 resources，请求 UAC 后由提权进程解压
        await updatePartElevated(app, partPackagePath, target)
        return
      }
      log.warn('安装目录不可写，改用完整安装包')
      downloadFull(app, value)
      return
    }

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

  function canWrite (dir) {
    try {
      fs.accessSync(dir, fs.constants.W_OK)
      return true
    } catch {
      return false
    }
  }

  /**
   * 提权解压增量包：UAC 授权后由 PowerShell 结束当前进程、覆盖 resources、再重启应用。
   * 用户取消 UAC 时当前进程仍在，发送错误提示，由用户决定稍后重试。
   */
  async function updatePartElevated (app, partPackagePath, target) {
    const scriptPath = path.join(path.dirname(partPackagePath), 'apply-update.ps1')
    const quote = p => String(p).replaceAll("'", "''")
    const script = [
      "$ErrorActionPreference = 'Stop'",
      // 连同 mitmproxy 子进程一起结束，避免占用 resources 里的文件
      `taskkill /PID ${process.pid} /T /F | Out-Null`,
      'Start-Sleep -Milliseconds 800',
      `Expand-Archive -LiteralPath '${quote(partPackagePath)}' -DestinationPath '${quote(target)}' -Force`,
      `Start-Process -FilePath '${quote(app.getPath('exe'))}'`,
    ].join('\r\n')
    fs.writeFileSync(scriptPath, script, 'utf8')

    const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`
    log.info('安装目录不可写，请求管理员权限解压增量包:', scriptPath)
    try {
      await new Promise((resolve, reject) => {
        sudoPrompt.exec(command, { name: 'dev-sidecar' }, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    } catch (e) {
      log.warn('请求管理员权限失败:', e)
      sendUpdateMessage({
        key: 'error',
        value: e,
        error: `安装目录需要管理员权限，已取消增量更新：${e.message || e}`,
      })
    }
  }

  autoUpdater.on('error', (error) => {
    log.warn('autoUpdater error:', error)
    sendUpdateMessage({ key: 'error', value: error, error })
    // dialog.showErrorBox('Error: ', error == null ? 'unknown' : (error.stack || error).toString())
  })
  autoUpdater.on('checking-for-update', () => {
    log.info('autoUpdater checking-for-update')
    sendUpdateMessage({ key: 'checking', value: message.checking })
  })
  autoUpdater.on('update-available', (info) => {
    log.info('autoUpdater update-available')
    sendUpdateMessage({ key: 'available', value: info })
  })
  autoUpdater.on('update-not-available', () => {
    log.info('autoUpdater update-not-available')
    sendUpdateMessage({ key: 'notAvailable', value: message.updateNotAva })
  })
  // 更新下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    log.info('autoUpdater download-progress')
    win.webContents.send('update', { key: 'progress', value: Number.parseInt(progressObj.percent) })
  })
  // 更新完成，重启应用
  autoUpdater.on('update-downloaded', (info) => {
    log.info('download complete, version:', info.version)
    win.webContents.send('update', {
      key: 'downloaded',
      value: info,
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
    } else if (arg.key === 'downloadFull') {
      // 下载完整安装包
      log.info('autoUpdater downloadFull')
      downloadFull(app, arg.value)
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
        },
      })
    }
    updateHandle(app, api, win, beforeQuit, quit, log)
  },
}
