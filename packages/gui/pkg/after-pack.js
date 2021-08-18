const path = require('path')
const AdmZip = require('adm-zip')
const pkg = require('../package.json')
const fs = require('fs')

function writeAppUpdateYmlForLinux () {
  const publishUrl = process.env.VUE_APP_PUBLISH_URL
  const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
  // provider: generic
  // url: 'http://dev-sidecar.docmirror.cn/update/preview/'
  // updaterCacheDirName: '@docmirrordev-sidecar-gui-updater'
  const fileContent = `provider: ${publishProvider}
url: '${publishUrl}'
updaterCacheDirName: '@docmirrordev-sidecar-gui-updater'
`
  console.log('write linux app-update.yml,updateUrl:', publishUrl)
  const filePath = path.resolve('./dist_electron/linux-unpacked/resources/app-update.yml')
  fs.writeFileSync(filePath, fileContent)
}
exports.default = async function (context) {
  // console.log('context', context)
  let targetPath
  let systemType = ''
  if (context.packager.platform.nodeName === 'darwin') {
    targetPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app/Contents/Resources`)
    systemType = 'mac'
  } else if (context.packager.platform.nodeName === 'linux') {
    targetPath = path.join(context.appOutDir, './resources')
    systemType = 'linux'
    writeAppUpdateYmlForLinux()
  } else {
    targetPath = path.join(context.appOutDir, './resources')
    systemType = 'win'
  }
  const zip = new AdmZip()
  zip.addLocalFolder(targetPath)
  const partUpdateFile = `update-${systemType}-${pkg.version}.zip`
  zip.writeZip(path.join(context.outDir, partUpdateFile))
}
