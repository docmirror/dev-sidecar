const cmd = require('node-cmd')
const util = require('util')
const winExec = util.promisify(cmd.get, { multiArgs: true, context: cmd })
const os = require('os')
const config = require('../../../lib/proxy/common/config')
class SystemProxy {
  static async setProxy (ip, port) {
    throw new Error('You have to implement the method setProxy!')
  }

  static async unsetProxy () {
    throw new Error('You have to implement the method unsetProxy!')
  }
}

class DarwinSystemProxy extends SystemProxy {

}
class LinuxSystemProxy extends SystemProxy {

}

class WindowsSystemProxy extends SystemProxy {
  static async setProxy (ip, port) {
    let ret = await winExec(`npm config set proxy=http://${ip}:${port}`)
    console.log('npm http proxy set success', ret)

    ret = await winExec(`npm config set https-proxy=http://${ip}:${port}`)
    console.log('npm https proxy set success', ret)

    ret = await winExec(`npm config set ca ${config.getDefaultCACertPath()}`)
    console.log('npm cafile set success', ret)

    // ret = await winExec('npm config set strict-ssl false')
    // console.log('npm strict-ssl false success', ret)
  }

  static async unsetProxy () {
    await winExec('npm config  delete proxy')
    console.log('npm https proxy unset success')
    await winExec('npm config  delete https-proxy')
    console.log('npm https proxy unset success')

    await winExec('npm config  delete ca')
    console.log('npm ca unset success')
    // await winExec(' npm config delete strict-ssl')
    // console.log('npm strict-ssl true success')
  }

  static _asyncRegSet (regKey, name, type, value) {
    return new Promise((resolve, reject) => {
      regKey.set(name, type, value, e => {
        if (e) {
          reject(e)
        } else {
          resolve()
        }
      })
    })
  }
}

function getSystemProxy () {
  switch (os.platform()) {
    case 'darwin':
      return DarwinSystemProxy
    case 'linux':
      return LinuxSystemProxy
    case 'win32':
    case 'win64':
      return WindowsSystemProxy
    case 'unknown os':
    default:
      throw new Error(`UNKNOWN OS TYPE ${os.platform()}`)
  }
}

module.exports = {
  async setProxy (ip, port) {
    const systemProxy = getSystemProxy()
    await systemProxy.setProxy(ip, port)
  },
  async unsetProxy () {
    const systemProxy = getSystemProxy()
    await systemProxy.unsetProxy()
  }
}
