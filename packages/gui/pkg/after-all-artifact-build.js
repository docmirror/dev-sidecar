const path = require('path')
const pkg = require('../package.json')
const fs = require('fs')

function appendIntro (context, systemType, latest) {
  const version = pkg.version
  const partUpdateFile = `update-${systemType}-${version}.zip`

  const partUpdateUrl = context.configuration.publish.url + partUpdateFile

  const latestFilePath = path.join(context.outDir, latest)
  fs.appendFile(latestFilePath, `partPackage: ${partUpdateUrl}
partMiniVersion: 1.7.0
releaseNotes:
  - 升级日志
  - https://download.fastgit.org/docmirror/dev-sidecar/releases/download/v${version}/DevSidecar-${version}.exe
`,
  (err) => {
    if (err) {
      console.log('修改latest 失败')
    }
  })
}
exports.default = async function (context) {
  console.log('after-all-artifact-build')
  appendIntro(context, 'mac', 'latest-mac.yml')
  appendIntro(context, 'win', 'latest.yml')
  appendIntro(context, 'linux', 'latest-linux.yml')
}
