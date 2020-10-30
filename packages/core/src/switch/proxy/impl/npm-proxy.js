const config = require('../../../lib/proxy/common/config')
const Shell = require('../../../shell')

module.exports = {
  async setProxy (ip, port) {
    const cmds = [
      `npm config set proxy=http://${ip}:${port}`,
      `npm config set https-proxy=http://${ip}:${port}`,
      `npm config set NODE_EXTRA_CA_CERTS ${config.getDefaultCACertPath()}`,
      'npm config set strict-ssl false'
    ]
    const ret = await Shell.exec(cmds)
    return ret
  },

  async unsetProxy () {
    const cmds = [
      'npm config  delete proxy',
      'npm config  delete https-proxy',
      'npm config  delete NODE_EXTRA_CA_CERTS',
      'npm config  delete strict-ssl'
    ]
    const ret = await Shell.exec(cmds)
    return ret
  }
}
