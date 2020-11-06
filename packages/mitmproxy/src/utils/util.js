const os = require('os')
const util = {
  getNodeVersion () {
    const version = process.version
    console.log(version)
  }
}
util.getNodeVersion()
module.exports = util
