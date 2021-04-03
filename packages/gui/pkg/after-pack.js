const path = require('path')
const AdmZip = require('adm-zip')
const pkg = require('../package.json')
exports.default = async function (context) {
  // console.log('context', context)
  let targetPath
  let systemType = ''
  if (context.packager.platform.nodeName === 'darwin') {
    targetPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app/Contents/Resources`)
    systemType = 'mac'
  } else {
    targetPath = path.join(context.appOutDir, './resources')
    systemType = 'win'
  }
  const zip = new AdmZip()
  zip.addLocalFolder(targetPath)
  const partUpdateFile = `update-${systemType}-${pkg.version}.zip`
  zip.writeZip(path.join(context.outDir, partUpdateFile))
}
