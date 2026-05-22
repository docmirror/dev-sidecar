import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

function appendIntro (context, systemType, latest) {
  const version = pkg.version
  const partUpdateFile = `update-${systemType}-${version}.zip`

  const publishConfig = context.configuration.publish
  if (!publishConfig || !publishConfig.url) {
    console.log(`跳过 latest 修改: ${latest}，publish 配置不可用`)
    return
  }
  const partUpdateUrl = publishConfig.url + partUpdateFile

  const latestFilePath = path.join(context.outDir, latest)
  fs.appendFile(latestFilePath, `partPackage: ${partUpdateUrl}\npartMiniVersion: 1.7.0\nreleaseNotes:\n  - 升级日志\n  - https://download.fastgit.org/docmirror/dev-sidecar/releases/download/v${version}/DevSidecar-${version}.exe\n`, (err) => {
    if (err) {
      console.log('修改latest 失败')
    }
  })
}

export default async function (context) {
  console.log('after-all-artifact-build')
  appendIntro(context, 'mac', 'latest-mac.yml')
  appendIntro(context, 'win', 'latest.yml')
  appendIntro(context, 'linux', 'latest-linux.yml')
}
