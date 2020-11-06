const os = require('os')
module.exports = {
  isWindows7 () {
    const version = os.release()
  }
}
