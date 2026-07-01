const fs = require('node:fs')
const path = require('node:path')
const archiver = require('archiver')
const pkg = require('../package.json')

/**
 * 删除 Electron 自带的语言包，只保留中文和英文
 * 可减少约 15-20MB
 */
function pruneLocales (resourcesDir, platform) {
  let localesDir
  if (platform === 'mac') {
    // macOS: Contents/Resources/locales/
    localesDir = path.join(resourcesDir, 'locales')
  } else {
    // Windows/Linux: resources/app.asar.unpacked 的 locales 可能在 framework 中
    // Electron 的 locales 通常在 app 同级目录
    localesDir = path.join(path.dirname(resourcesDir), 'locales')
  }

  if (!fs.existsSync(localesDir)) {
    // try alternative: inside resources
    localesDir = path.join(resourcesDir, 'locales')
    if (!fs.existsSync(localesDir)) {
      console.log('locales dir not found at:', localesDir)
      return
    }
  }

  const keep = new Set(['zh-CN.pak'])
  const files = fs.readdirSync(localesDir)
  let removed = 0
  let savedBytes = 0
  for (const file of files) {
    if (keep.has(file)) continue
    const filePath = path.join(localesDir, file)
    const stat = fs.statSync(filePath)
    savedBytes += stat.size
    fs.unlinkSync(filePath)
    removed++
  }
  console.log(`Removed ${removed} unused locale files, saved ${(savedBytes / 1024 / 1024).toFixed(1)} MB`)
}

function writeAppUpdateYmlForLinux (appOutDir) {
  const publishUrl = process.env.VUE_APP_PUBLISH_URL
  const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
  if (!publishUrl || !publishProvider) return
  const fileContent = `provider: ${publishProvider}
url: '${publishUrl}'
updaterCacheDirName: 'dev-sidecar-gui-updater'
`
  console.log('write linux app-update.yml, updateUrl:', publishUrl)
  const filePath = path.join(appOutDir, 'resources', 'app-update.yml')
  fs.writeFileSync(filePath, fileContent)
}

exports.default = async function (context) {
  let resourcesDir
  let platform

  if (context.packager.platform.nodeName === 'darwin') {
    resourcesDir = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app/Contents/Resources`)
    platform = 'mac'
  } else if (context.packager.platform.nodeName === 'linux') {
    resourcesDir = path.join(context.appOutDir, './resources')
    platform = 'linux'
    writeAppUpdateYmlForLinux(context.appOutDir)
  } else {
    resourcesDir = path.join(context.appOutDir, './resources')
    platform = 'win'
  }

  // 清理无用语言包
  pruneLocales(resourcesDir, platform)

  // 删除 core 包里冗余的 exe（已在 extra/ 中通过 extraResources 提供）
  const duplicateExes = [
    'EnableLoopback.exe',
    'sysproxy.exe',
  ]
  for (const exe of duplicateExes) {
    const dupPath = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', '@docmirror', 'dev-sidecar', 'src', 'shell', 'scripts', 'extra-path', exe)
    if (fs.existsSync(dupPath)) {
      fs.unlinkSync(dupPath)
      console.log(`Removed duplicate exe: ${dupPath}`)
    }
  }

  // 打包 update 用的 ZIP（按架构分离，原生模块架构相关）
  // context.arch is the target architecture string (e.g., 'arm64', 'x64', 'ia32', 'armv7l')
  // context.packager.platform does NOT have an .arch property — using it always fell through to 'x64'
  const arch = context.arch || 'x64'  // fallback to x64 if undefined
  const partUpdateFile = `update-${platform}-${arch}-${pkg.version}.zip`
  const outputPath = path.join(context.outDir, partUpdateFile)

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      console.log(`Created ${partUpdateFile}, size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`)
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(resourcesDir, false)
    archive.finalize()
  })
}
