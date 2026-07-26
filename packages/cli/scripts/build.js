#!/usr/bin/env node
// ds-cli SEA 打包脚本
// 用法:
//   node scripts/build.js          # 仅打包本机平台
//   node scripts/build.js --all    # 打包所有平台

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')
const https = require('node:https')
const http = require('node:http')
const { createGunzip } = require('node:zlib')
const tar = require('tar')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const VERSION = require(path.join(ROOT, 'package.json')).version
const NODE_VERSION = 'v24.14.0'
const SENTINEL = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

const ALL_PLATFORMS = ['linux-x64', 'linux-arm64', 'macos-x64', 'macos-arm64', 'windows-x64']

const PLATFORM_LABELS = {
  'linux-x64': 'Linux x64',
  'linux-arm64': 'Linux arm64',
  'macos-x64': 'macOS x64',
  'macos-arm64': 'macOS arm64',
  'windows-x64': 'Windows x64',
}

// ── 平台识别 ──────────────────────────────────────────

function getCurrentPlatform () {
  const os = process.platform
  const arch = process.arch
  if (os === 'linux') return arch === 'arm64' ? 'linux-arm64' : 'linux-x64'
  if (os === 'darwin') return arch === 'arm64' ? 'macos-arm64' : 'macos-x64'
  if (os === 'win32') return 'windows-x64'
  return 'unknown'
}

function getNodeDownloadUrl (platform) {
  const base = `https://nodejs.org/dist/${NODE_VERSION}`
  switch (platform) {
    case 'linux-x64': return `${base}/node-${NODE_VERSION}-linux-x64`
    case 'linux-arm64': return `${base}/node-${NODE_VERSION}-linux-arm64.tar.gz`
    case 'macos-x64': return `${base}/node-${NODE_VERSION}-darwin-x64.tar.gz`
    case 'macos-arm64': return `${base}/node-${NODE_VERSION}-darwin-arm64.tar.gz`
    case 'windows-x64': return `${base}/win-x64/node.exe`
  }
}

function needsExtraction (platform) {
  return platform !== 'windows-x64' && platform !== 'linux-x64'
}

function getOutputName (platform) {
  return platform === 'windows-x64'
    ? `ds-cli-${VERSION}-windows-x64.exe`
    : `ds-cli-${VERSION}-${platform}`
}

// ── 下载 ──────────────────────────────────────────────

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
    }).on('error', (err) => { file.close(); fs.unlinkSync(dest); reject(err) })
  })
}

// ── 解压 tar.gz ───────────────────────────────────────

async function extractTarGz (tarPath, destDir) {
  await tar.extract({ file: tarPath, cwd: destDir })
}

// ── 主流程 ────────────────────────────────────────────

async function main () {
  const os = require('node:os')
  const buildAll = process.argv.includes('--all')
  const currentPlatform = getCurrentPlatform()
  const targets = buildAll ? ALL_PLATFORMS : [currentPlatform]

  console.log(`版本:     v${VERSION}`)
  console.log(`本机系统: ${os.type()} ${os.release()} (${os.arch()})`)
  console.log(`本机平台: ${PLATFORM_LABELS[currentPlatform] || currentPlatform}`)
  console.log(`目标平台: ${targets.map(t => PLATFORM_LABELS[t] || t).join(', ')}`)
  console.log(`Node.js:  ${NODE_VERSION}`)
  console.log()

  fs.mkdirSync(DIST, { recursive: true })
  fs.mkdirSync(path.join(DIST, 'node-bin'), { recursive: true })

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

  // Step 3: 下载 Node.js 二进制
  console.log('==> Step 3: 下载 Node.js 二进制...')
  for (const platform of targets) {
    const nodeBin = path.join(DIST, 'node-bin', `node-${platform}`)
    if (fs.existsSync(nodeBin)) {
      console.log(`    ${platform} 已存在，跳过`)
      continue
    }

    const url = getNodeDownloadUrl(platform)
    const tmpFile = path.join(DIST, 'node-bin', `tmp-${platform}`)

    try {
      await download(url, tmpFile)

      if (needsExtraction(platform)) {
        // tar.gz 需要提取 node 二进制
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
      console.log(`    ${platform} 下载完成`)
    } catch (e) {
      console.error(`    ${platform} 下载失败: ${e.message}`)
      process.exit(1)
    }
  }
  console.log()

  // Step 4: 注入 blob
  console.log('==> Step 4: 注入 SEA blob...')
  for (const platform of targets) {
    const nodeBin = path.join(DIST, 'node-bin', `node-${platform}`)
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

  // Step 5: 验证
  console.log('==> Step 5: 验证...')
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

main().catch((e) => {
  console.error('打包失败:', e.message)
  process.exit(1)
})
