const path = require('path')
const AdmZip = require('adm-zip')
const pkg = require('../package.json')
const fs = require('fs')
exports.default = async function (context) {
  console.log('context', context)
  let targetPath
  let latest = null
  if (context.packager.platform.nodeName === 'darwin') {
    targetPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app/Contents/Resources`)
    latest = 'latest-mac.yml'
  } else {
    targetPath = path.join(context.appOutDir, './resources')
    latest = 'latest.yml'
  }
  const zip = new AdmZip()
  zip.addLocalFolder(targetPath)
  const partUpdateFile = `update-${pkg.version}.zip`
  zip.writeZip(path.join(context.outDir, partUpdateFile))

  const partUpdateUrl = 'http://dev-sidecar.docmirror.cn/update/' + partUpdateFile

  fs.appendFile(path.join(context.outDir, latest), `partPackage: ${partUpdateUrl}\nreleaseNotes: \n  - 升级日志`, (err) => {
    if (err) {
      console.log('修改latest 失败')
    }
  })
}
