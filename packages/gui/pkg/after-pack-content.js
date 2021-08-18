const fs = require('fs')
exports.default = async function (context) {
  // console.log('context', context)
  if (context.packager.platform.nodeName === 'linux') {
    fs.copyFileSync('../build/app-update.yml', '../dist_electron/linux_unpacked/resources/app-update.yml')
  }
}
