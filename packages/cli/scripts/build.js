#!/usr/bin/env node
// ds-cli SEA 打包脚本
// 用法:
//   node scripts/build.js          # 仅打包本机平台
//   node scripts/build.js --all    # 打包所有平台（从 Node.js 官方获取可用平台列表）

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const { execSync } = require('node:child_process')
const https = require('node:https')
const http = require('node:http')
const tar = require('tar')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const VERSION = require(path.join(ROOT, 'package.json')).version
const NODE_VERSION = 'v24.14.0'
const SENTINEL = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

/** 下载停滞判定与重试次数：CI 上一次卡住的下载会把 job 拖到超时，必须显式兜住 */
const DOWNLOAD_STALL_TIMEOUT_MS = 30 * 1000
const DOWNLOAD_ATTEMPTS = 2

/** Windows 产物需要与可执行文件同目录的 helper（core 的 extra-path 会在此查找） */
const WINDOWS_HELPERS = ['sysproxy.exe', 'EnableLoopback.exe']

// ── 平台识别 ──────────────────────────────────────────

function getCurrentPlatform () {
  const p = process.platform
  const a = process.arch
  if (p === 'linux') return a === 'arm64' ? 'linux-arm64' : 'linux-x64'
  if (p === 'darwin') return a === 'arm64' ? 'macos-arm64' : 'macos-x64'
  if (p === 'win32') return 'windows-x64'
  return 'unknown'
}

function getNodeDownloadUrl (platform) {
  const base = `https://nodejs.org/dist/${NODE_VERSION}`
  const map = {
    'linux-x64': `${base}/node-${NODE_VERSION}-linux-x64.tar.gz`,
    'linux-x64-armv7l': `${base}/node-${NODE_VERSION}-linux-armv7l.tar.gz`,
    'linux-arm64': `${base}/node-${NODE_VERSION}-linux-arm64.tar.gz`,
    'macos-x64': `${base}/node-${NODE_VERSION}-darwin-x64.tar.gz`,
    'macos-arm64': `${base}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    'windows-x64': `${base}/win-x64/node.exe`,
    'windows-arm64': `${base}/win-arm64/node.exe`,
  }
  return map[platform]
}

function needsExtraction (platform) {
  // 只有 Windows 各架构（x64 / arm64）是裸 node.exe，不能解压；
  // 其余平台一律是 .tar.gz（linux-x64 曾被误当成裸二进制，而 Node v24 的发布物
  // 只有 node-vX-linux-x64.tar.gz，无扩展名的地址会 404，打包因此失败）。
  return !platform.startsWith('windows-')
}

function getOutputName (platform) {
  return platform === 'windows-x64' || platform === 'windows-arm64'
    ? `ds-cli-${VERSION}-${platform}.exe`
    : `ds-cli-${VERSION}-${platform}`
}

// ── 下载与校验 ────────────────────────────────────────

function download (url, dest, attempt = 1) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    let settled = false
    let stallTimer = null

    const clearStall = () => {
      if (stallTimer != null) {
        clearTimeout(stallTimer)
        stallTimer = null
      }
    }
    const cleanup = () => {
      clearStall()
      try { file.close() } catch {}
      try { fs.unlinkSync(dest) } catch {}
    }
    const fail = (err) => {
      if (settled) return
      settled = true
      cleanup()
      if (attempt < DOWNLOAD_ATTEMPTS) {
        console.warn(`    下载失败，第 ${attempt} 次重试：${url}（${err.message}）`)
        return download(url, dest, attempt + 1).then(resolve, reject)
      }
      reject(err)
    }
    const ok = () => {
      if (settled) return
      settled = true
      clearStall()
      file.close()
      resolve()
    }
    // 停滞保护：超过 DOWNLOAD_STALL_TIMEOUT_MS 没有任何数据就判定失败并重试
    const bumpStall = () => {
      clearStall()
      stallTimer = setTimeout(() => {
        try { req.destroy() } catch {}
        fail(new Error(`下载停滞超过 ${DOWNLOAD_STALL_TIMEOUT_MS}ms`))
      }, DOWNLOAD_STALL_TIMEOUT_MS)
    }

    // 第一次沿用环境变量代理（有 DS 时走它）；失败重试时改用显式 agent 直连。
    // 本机开着 NODE_USE_ENV_PROXY=1 时，不带 agent 的请求一律被 HTTPS_PROXY 拖走，
    // 代理没在跑就会直接失败（实测：DS 停止后抓 SHASUMS256.txt 报 ECONNREFUSED）。
    const directAgent = attempt > 1
      ? (url.startsWith('https') ? new https.Agent({ keepAlive: false }) : new http.Agent({ keepAlive: false }))
      : null
    const req = mod.get(url, directAgent == null ? {} : { agent: directAgent }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 重定向不消耗重试次数
        settled = true
        cleanup()
        return download(res.headers.location, dest, attempt).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        try { req.destroy() } catch {}
        return fail(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      res.on('data', bumpStall)
      bumpStall()
      res.pipe(file)
      file.on('finish', ok)
    })
    req.on('error', (err) => fail(err))
  })
}

function sha256 (filePath) {
  const data = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(data).digest('hex')
}

async function extractTarGz (tarPath, destDir) {
  await tar.extract({ file: tarPath, cwd: destDir })
}

// ── 动态获取可用平台 + 校验和 ──────────────────────────

async function fetchChecksums () {
  const url = `https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt`
  const tmpFile = path.join(DIST, 'shasums.txt')
  fs.mkdirSync(DIST, { recursive: true })
  await download(url, tmpFile)
  const content = fs.readFileSync(tmpFile, 'utf-8')
  fs.unlinkSync(tmpFile)

  const checksums = {} // filename -> sha256
  const platforms = new Set()

  for (const line of content.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 2) continue
    const [hash, filename] = parts
    if (!/^[a-f0-9]{64}$/.test(hash)) continue

    checksums[filename] = hash

    // 从文件名提取平台
    const tarMatch = filename.match(/node-v[^ ]+?-(linux|darwin|aix|sunos)-(x64|arm64|armv7l|ppc64|s390x)\.tar\.gz$/)
    if (tarMatch) {
      const mapped = mapNodePlatform(`${tarMatch[1]}-${tarMatch[2]}`)
      if (mapped) platforms.add(mapped)
    }
    const binMatch = filename.match(/(?:node-v[^ ]+?-)?(linux-x64|win-x64|win-arm64)(?:\/node\.exe)?$/)
    if (binMatch) {
      const mapped = mapNodePlatform(binMatch[1])
      if (mapped) platforms.add(mapped)
    }
  }

  return { checksums, platforms: [...platforms].sort() }
}

function mapNodePlatform (nodePlatform) {
  const map = {
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
    'linux-armv7l': 'linux-x64-armv7l',
    'darwin-x64': 'macos-x64',
    'darwin-arm64': 'macos-arm64',
    'win-x64': 'windows-x64',
    'win-arm64': 'windows-arm64',
  }
  return map[nodePlatform]
}

// ── 增量构建 ──────────────────────────────────────────

function hashDir (hash, dir) {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    if (f.endsWith('.js')) {
      hash.update(fs.readFileSync(path.join(dir, f)))
    }
  }
}

function computeSourceHash () {
  const hash = crypto.createHash('sha256')
  // 入口文件
  hash.update(fs.readFileSync(path.join(ROOT, 'src/sea-entry.js')))
  // src/ 下所有 js 文件
  hashDir(hash, path.join(ROOT, 'src'))
  // 打包进 bundle 的依赖源码（core / mitmproxy）
  hashDir(hash, path.join(ROOT, '../core/src'))
  hashDir(hash, path.join(ROOT, '../mitmproxy/src'))
  // package.json（版本号变化也应触发重建）
  hash.update(fs.readFileSync(path.join(ROOT, 'package.json')))
  return hash.digest('hex')
}

function getCachedBuildHash () {
  const hashFile = path.join(DIST, 'build-hash.txt')
  if (!fs.existsSync(hashFile)) return null
  return fs.readFileSync(hashFile, 'utf-8').trim()
}

function saveBuildHash (hash) {
  fs.writeFileSync(path.join(DIST, 'build-hash.txt'), hash)
}

// ── 官方配置同步 ──────────────────────────────────────

// 把「官方远程配置」同步进内置配置（internal），与 GUI 构建保持一致。
// 不阻断构建：脚本自身在拉取/校验失败时会保留上一次的同步结果并打印警告。
function syncOfficialConfig () {
  const script = path.resolve(ROOT, '..', '..', '_script', 'sync-official-config.mjs')
  try {
    execSync(`node "${script}"`, { stdio: 'inherit' })
  } catch (e) {
    console.warn(`[build] 官方配置同步失败，使用现有内置配置继续构建: ${e.message}`)
  }
}

// ── 主流程 ────────────────────────────────────────────

async function main () {
  const buildAll = process.argv.includes('--all')
  const currentPlatform = getCurrentPlatform()

  syncOfficialConfig()

  console.log(`版本:     v${VERSION}`)
  console.log(`本机系统: ${os.type()} ${os.release()} (${os.arch()})`)
  console.log(`本机平台: ${currentPlatform}`)
  console.log(`Node.js:  ${NODE_VERSION}`)
  console.log()

  fs.mkdirSync(DIST, { recursive: true })
  fs.mkdirSync(path.join(DIST, 'node-bin'), { recursive: true })

  // 增量构建检查
  const currentHash = computeSourceHash()
  const cachedHash = getCachedBuildHash()
  const bundle = path.join(DIST, 'ds-cli-bundle.js')
  const blob = path.join(DIST, 'ds-cli-prep.blob')
  const skipBuild = cachedHash === currentHash && fs.existsSync(bundle) && fs.existsSync(blob)

  if (skipBuild) {
    console.log('==> 源码未变化，跳过 esbuild 和 blob 生成（使用缓存）')
  } else {
    // 清理旧构建产物（保留 node-bin 缓存）
    console.log('==> 清理旧构建产物...')
    for (const f of fs.readdirSync(DIST)) {
      // 两个 helper 是复制进产物目录的，重建时一并清理，避免留下过期文件
      if (f.startsWith('ds-cli-') || f === 'sea-config.json' || f === 'ds-cli-bundle.js' || f === 'ds-cli-prep.blob' || WINDOWS_HELPERS.includes(f)) {
        fs.rmSync(path.join(DIST, f), { force: true })
      }
    }
    console.log()

    // Step 1: esbuild
    console.log('==> Step 1: esbuild 打包...')
    const esbuild = require('esbuild')
    await esbuild.build({
      entryPoints: [path.join(ROOT, 'src/sea-entry.js')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: bundle,
      external: [
        'node:*',
        // 原生 .node 模块无法打进 SEA bundle，运行时 require 失败会被调用方 try/catch 兜底
        '@starknt/sysproxy',
        // keytar / koffi 及其平台预编译包内含 .node，esbuild 无 .node loader，必须 external
        'keytar',
        'koffi',
        '@koromix/koffi-*',
        '*.node',
        // free-eye 为 ESM 模块且依赖源码目录数据，独立可执行文件中不可用；
        // core 以相对路径 require 它，必须用通配符匹配，包名前缀匹配不到
        '*free-eye',
      ],
    })
    const bundleSize = (fs.statSync(bundle).size / 1024 / 1024).toFixed(1)
    console.log(`    完成: ${bundle} (${bundleSize}MB)\n`)
  }

  // Step 2: 获取校验和 + 确定目标平台
  console.log('==> Step 2: 获取平台信息和校验和...')
  const { checksums, platforms: availablePlatforms } = await fetchChecksums()
  const targets = buildAll ? availablePlatforms : [currentPlatform]
  console.log(`    目标平台: ${targets.join(', ')}`)
  console.log()

  // Step 3: 并行下载 Node.js 二进制
  console.log('==> Step 3: 下载 Node.js 二进制（并行）...')
  const downloadTasks = targets.map(platform => downloadNodeBinary(platform, checksums))
  const results = await Promise.allSettled(downloadTasks)

  let downloadFailed = false
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const platform = targets[i]
    if (result.status === 'fulfilled') {
      console.log(`    ${platform} 下载完成`)
    } else {
      console.error(`    ${platform} 下载失败: ${result.reason.message}`)
      downloadFailed = true
    }
  }
  if (downloadFailed) process.exit(1)
  console.log()

  // Step 4: 生成 SEA blob
  // 使用已下载的当前平台 node 二进制生成 blob，保证 blob 与目标运行时（NODE_VERSION）完全一致，
  // 避免 host node 版本与运行时版本不兼容导致的 "v8::ToLocalChecked Empty MaybeLocal" 崩溃
  if (!skipBuild) {
    console.log('==> Step 4: 生成 SEA blob...')
    const seaConfig = path.join(DIST, 'sea-config.json')
    fs.writeFileSync(seaConfig, JSON.stringify({
      main: bundle,
      output: blob,
      disableExperimentalSEAWarning: true,
    }))
    const blobNode = path.join(DIST, 'node-bin', `node-${currentPlatform}`)
    // 下载的 Windows 裸二进制文件名没有 .exe，交给 cmd 执行会报“不是内部或外部命令”，
    // 因此在 Windows 上先补一个带 .exe 的临时副本（文件名不影响 --experimental-sea-config）。
    let seaNode = fs.existsSync(blobNode) ? blobNode : process.execPath
    let seaNodeTmp = null
    if (process.platform === 'win32' && seaNode === blobNode) {
      seaNodeTmp = `${blobNode}.exe`
      fs.copyFileSync(blobNode, seaNodeTmp)
      seaNode = seaNodeTmp
    }
    try {
      execSync(`"${seaNode}" --experimental-sea-config "${seaConfig}"`, { stdio: 'inherit' })
    } finally {
      if (seaNodeTmp != null) {
        fs.rmSync(seaNodeTmp, { force: true })
      }
    }
    saveBuildHash(currentHash)
    console.log()
  }

  // Step 5: 注入 blob
  console.log('==> Step 5: 注入 SEA blob...')
  for (const platform of targets) {
    const nodeBin = path.join(DIST, 'node-bin', `node-${platform}`)
    if (!fs.existsSync(nodeBin)) {
      console.log(`    ${platform} 跳过（二进制不存在）`)
      continue
    }

    const output = path.join(DIST, getOutputName(platform))
    fs.copyFileSync(nodeBin, output)
    execSync(`npx postject "${output}" NODE_SEA_BLOB "${blob}" --sentinel-fuse ${SENTINEL}`, {
      stdio: 'pipe',
    })
    if (process.platform !== 'win32') {
      fs.chmodSync(output, 0o755)
    }
    const size = (fs.statSync(output).size / 1024 / 1024).toFixed(1)
    console.log(`    ${platform} 完成: ${size}MB`)
  }
  console.log()

  // Step 6: 验证
  console.log('==> Step 6: 验证...')
  const verifyBin = path.join(DIST, getOutputName(currentPlatform))
  if (fs.existsSync(verifyBin)) {
    try {
      const result = execSync(`"${verifyBin}" version`, { encoding: 'utf-8' }).trim()
      if (result === VERSION) {
        console.log(`    验证通过: v${result}`)
      } else {
        console.error(`    验证失败: 期望 v${VERSION}, 实际 ${result}`)
        process.exit(1)
      }
      // 冒烟测试：加载 core（校验 bundle 完整性，如 free-eye 等外部模块是否正确排除）
      execSync(`"${verifyBin}" status`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
      console.log('    冒烟测试通过: status')
    } catch (e) {
      console.error(`    验证失败: ${e.message}`)
      process.exit(1)
    }
  }
  console.log()

  // 输出结果
  console.log('==> 打包完成！')
  // Windows 产物需要两个 helper 与可执行文件同目录：
  // sysproxy.exe 是 core 在原生模块 @starknt/sysproxy 不可用时的回退（SEA 单文件里必然不可用），
  // EnableLoopback.exe 供 `ds-cli proxy loopback` 提权运行。core 的 extra-path 会按
  // DS_EXTRA_PATH → resources/extra → __dirname 依次查找，SEA 下 __dirname 即产物目录，所以放在这里即可命中。
  if (targets.some(t => t.startsWith('windows-'))) {
    const extraDir = path.resolve(__dirname, '../../core/src/shell/scripts/extra-path')
    for (const name of WINDOWS_HELPERS) {
      const src = path.join(extraDir, name)
      if (!fs.existsSync(src)) {
        throw new Error(`缺少 Windows helper: ${src}`)
      }
      fs.copyFileSync(src, path.join(DIST, name))
    }
    console.log(`==> 已随产物复制 Windows helper: ${WINDOWS_HELPERS.join(', ')}`)
  }

  const files = fs.readdirSync(DIST).filter(f => (f.startsWith('ds-cli-') && !f.endsWith('.js') && !f.endsWith('.blob') && !f.endsWith('.json')) || WINDOWS_HELPERS.includes(f))
  for (const f of files) {
    const size = (fs.statSync(path.join(DIST, f)).size / 1024 / 1024).toFixed(1)
    console.log(`    ${f}  (${size}MB)`)
  }
}

// ── 下载单个平台的 Node.js 二进制（含校验） ───────────

async function downloadNodeBinary (platform, checksums) {
  const nodeBin = path.join(DIST, 'node-bin', `node-${platform}`)

  // 如果已缓存且校验通过，跳过
  if (fs.existsSync(nodeBin)) {
    const expectedHash = checksums[getNodeFilename(platform)]
    if (expectedHash) {
      const actualHash = sha256(nodeBin)
      if (actualHash === expectedHash) {
        return // 缓存有效，跳过
      }
      // 校验失败，重新下载
      fs.rmSync(nodeBin, { force: true })
    }
  }

  const url = getNodeDownloadUrl(platform)
  if (!url) throw new Error(`${platform} 不支持`)

  const tmpFile = path.join(DIST, 'node-bin', `tmp-${platform}`)
  await download(url, tmpFile)

  // SHA256 校验
  const expectedHash = checksums[getNodeFilename(platform)]
  if (expectedHash) {
    const actualHash = sha256(tmpFile)
    if (actualHash !== expectedHash) {
      fs.unlinkSync(tmpFile)
      throw new Error(`SHA256 校验失败: 期望 ${expectedHash}, 实际 ${actualHash}`)
    }
  }

  if (needsExtraction(platform)) {
    const extractDir = path.join(DIST, 'node-bin', `extract-${platform}`)
    fs.mkdirSync(extractDir, { recursive: true })
    await extractTarGz(tmpFile, extractDir)
    const entries = fs.readdirSync(extractDir, { recursive: true })
    const nodeEntry = entries.find(e => path.basename(e) === 'node' && path.dirname(e).endsWith('bin'))
    if (nodeEntry) {
      fs.copyFileSync(path.join(extractDir, nodeEntry), nodeBin)
    }
    fs.rmSync(extractDir, { recursive: true, force: true })
    fs.unlinkSync(tmpFile)
  } else {
    fs.renameSync(tmpFile, nodeBin)
  }

  if (process.platform !== 'win32') {
    fs.chmodSync(nodeBin, 0o755)
  }
}

// 获取 SHASUMS256.txt 中对应的文件名
function getNodeFilename (platform) {
  const map = {
    'linux-x64': `node-${NODE_VERSION}-linux-x64.tar.gz`,
    'linux-arm64': `node-${NODE_VERSION}-linux-arm64.tar.gz`,
    'macos-x64': `node-${NODE_VERSION}-darwin-x64.tar.gz`,
    'macos-arm64': `node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    'windows-x64': `win-x64/node.exe`,
    'windows-arm64': `win-arm64/node.exe`,
  }
  return map[platform]
}

main().catch((e) => {
  console.error('打包失败:', e.message)
  process.exit(1)
})
