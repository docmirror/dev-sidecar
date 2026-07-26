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
    'linux-x64': `${base}/node-${NODE_VERSION}-linux-x64`,
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
  return platform !== 'windows-x64' && platform !== 'linux-x64'
}

function getOutputName (platform) {
  return platform === 'windows-x64' || platform === 'windows-arm64'
    ? `ds-cli-${VERSION}-${platform}.exe`
    : `ds-cli-${VERSION}-${platform}`
}

// ── 下载与校验 ────────────────────────────────────────

function download (url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlinkSync(dest)
        return download(res.headers.location, dest).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => { file.close(); try { fs.unlinkSync(dest) } catch {} ; reject(err) })
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

// ── 主流程 ────────────────────────────────────────────

async function main () {
  const buildAll = process.argv.includes('--all')
  const currentPlatform = getCurrentPlatform()

  console.log(`版本:     v${VERSION}`)
  console.log(`本机系统: ${os.type()} ${os.release()} (${os.arch()})`)
  console.log(`本机平台: ${currentPlatform}`)
  console.log(`Node.js:  ${NODE_VERSION}`)
  console.log()

  fs.mkdirSync(DIST, { recursive: true })
  fs.mkdirSync(path.join(DIST, 'node-bin'), { recursive: true })

  // 清理旧构建产物（保留 node-bin 缓存）
  console.log('==> 清理旧构建产物...')
  for (const f of fs.readdirSync(DIST)) {
    if (f.startsWith('ds-cli-') || f === 'sea-config.json' || f === 'ds-cli-bundle.js' || f === 'ds-cli-prep.blob') {
      fs.rmSync(path.join(DIST, f), { force: true })
    }
  }
  console.log()

  // Step 1: esbuild
  console.log('==> Step 1: esbuild 打包...')
  const bundle = path.join(DIST, 'ds-cli-bundle.js')
  execSync(
    `npx esbuild src/sea-entry.js --bundle --platform=node --target=node18 --format=cjs --outfile="${bundle}" "--external:node:*" "--external:@docmirror/dev-sidecar/src/modules/plugin/free-eye/*"`,
    { cwd: ROOT, stdio: 'inherit' },
  )
  const bundleSize = (fs.statSync(bundle).size / 1024 / 1024).toFixed(1)
  console.log(`    完成: ${bundle} (${bundleSize}MB)\n`)

  // Step 2: SEA blob
  console.log('==> Step 2: 生成 SEA blob...')
  const blob = path.join(DIST, 'ds-cli-prep.blob')
  const seaConfig = path.join(DIST, 'sea-config.json')
  fs.writeFileSync(seaConfig, JSON.stringify({
    main: bundle,
    output: blob,
    disableExperimentalSEAWarning: true,
  }))
  execSync(`node --experimental-sea-config "${seaConfig}"`, { stdio: 'inherit' })
  console.log()

  // Step 3: 获取校验和 + 确定目标平台
  console.log('==> Step 3: 获取平台信息和校验和...')
  const { checksums, platforms: availablePlatforms } = await fetchChecksums()
  const targets = buildAll ? availablePlatforms : [currentPlatform]
  console.log(`    目标平台: ${targets.join(', ')}`)
  console.log()

  // Step 4: 并行下载 Node.js 二进制
  console.log('==> Step 4: 下载 Node.js 二进制（并行）...')
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
    } catch (e) {
      console.error(`    验证失败: ${e.message}`)
    }
  }
  console.log()

  // 输出结果
  console.log('==> 打包完成！')
  const files = fs.readdirSync(DIST).filter(f => f.startsWith('ds-cli-') && !f.endsWith('.js') && !f.endsWith('.blob') && !f.endsWith('.json'))
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
    'linux-x64': `node-${NODE_VERSION}-linux-x64`,
    'linux-arm64': `node-${NODE_VERSION}-linux-arm64.tar.gz`,
    'macos-x64': `node-${NODE_VERSION}-darwin-x64.tar.gz`,
    'macos-arm64': `node-${NODE_VERSION}-darwin-arm64.tar.gz',
    'windows-x64': `win-x64/node.exe`,
    'windows-arm64': `win-arm64/node.exe`,
  }
  return map[platform]
}

main().catch((e) => {
  console.error('打包失败:', e.message)
  process.exit(1)
})
