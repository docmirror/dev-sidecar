const path = require('path')
const pkg = require('../package.json')
const fs = require('fs')

function appendIntro (context, systemType, latest) {
  const partUpdateFile = `update-${systemType}-${pkg.version}.zip`

  const partUpdateUrl = context.configuration.publish.url + partUpdateFile

  const latestFilePath = path.join(context.outDir, latest)
  fs.appendFile(latestFilePath, `\npartPackage: ${partUpdateUrl}\nreleaseNotes: \n  - 升级日志`, (err) => {
    if (err) {
      console.log('修改latest 失败')
    }
  })
}
exports.default = async function (context) {
  console.log('after-all-artifact-build', context)
  appendIntro(context, 'mac', 'latest-mac.yml')
  appendIntro(context, 'win', 'latest.yml')
  appendIntro(context, 'linux', 'latest-linux.yml')
}
