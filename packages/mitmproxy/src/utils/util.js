const os = require('os')
const log = require('util.log')
const util = {
  getNodeVersion () {
    const version = process.version
    log.info(version)
  }
}
util.getNodeVersion()
module.exports = util
