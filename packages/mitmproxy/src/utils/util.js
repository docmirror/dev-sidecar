// const os = require('os')
import { info } from './util.log.server'

const util = {
  getNodeVersion () {
    const version = process.version
    info(version)
  },
}
util.getNodeVersion()
export default util
