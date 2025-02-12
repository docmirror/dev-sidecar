// const os = require('os')
const log = require('packages/mitmproxy/src/utils/util.log.server')

const util = {
  getNodeVersion () {
    const version = process.version
    log.info(version)
  },
}
util.getNodeVersion()
module.exports = util
