const fs = require('node:fs')
const path = require('node:path')
const pkg = require('../package.json')

function writePartPackages (context) {
  const publishConfig = context.configuration.publish
  if (!publishConfig || !publishConfig.url) {
    console.log('跳过 latest 修改，publish 配置不可用')
    return
  }

  // Map platform -> latest yml file
  const platformLatestMap = {
    mac: 'latest-mac.yml',
    win: 'latest.yml',
    linux: 'latest-linux.yml',
  }

  // Collect partPackage URLs per platform from update ZIPs in outDir
  const platformParts = { mac: [], win: [], linux: [] }

  let files
  try {
    files = fs.readdirSync(context.outDir)
  } catch {
    console.log('无法读取 outDir:', context.outDir)
    return
  }

  const version = pkg.version
  for (const filename of files) {
    // Match: update-{platform}-{arch}-{version}.zip
    const match = filename.match(/^update-(mac|win|linux)-(x64|ia32|arm64|armv7l)-(.+)\.zip$/)
    if (match) {
      const [, platform] = match
      const partUpdateUrl = publishConfig.url + filename
      platformParts[platform].push(partUpdateUrl)
    }
  }

  // Write partPackage entries to each latest yml
  for (const [platform, urls] of Object.entries(platformParts)) {
    if (urls.length === 0) continue
    const latest = platformLatestMap[platform]
    if (!latest) continue

    const latestFilePath = path.join(context.outDir, latest)

    // Write one partPackage line per arch
    const lines = urls.map(url => `partPackage: ${url}`).join('\n')
    const appendContent = `${lines}\npartMiniVersion: 1.7.0\nreleaseNotes:\n  - 升级日志\n  - https://download.fastgit.org/docmirror/dev-sidecar/releases/download/v${version}/DevSidecar-${version}.exe\n`

    fs.appendFile(latestFilePath, appendContent, (err) => {
      if (err) {
        console.log(`修改 ${latest} 失败:`, err)
      } else {
        console.log(`已更新 ${latest}: ${urls.length} 个 partPackage`)
      }
    })
  }
}

exports.default = async function (context) {
  console.log('after-all-artifact-build')
  writePartPackages(context)
}
