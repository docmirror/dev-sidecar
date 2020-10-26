const cmd = require('node-cmd')
const util = require('util')
const winExec = util.promisify(cmd.get, { multiArgs: true, context: cmd })
const os = require('os')
// eslint-disable-next-line no-unused-vars
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
    let ret = await winExec(`yarn config set proxy=http://${ip}:${port}`)
    console.log('yarn http proxy set success', ret)

    ret = await winExec(`yarn config set https-proxy=http://${ip}:${port}`)
    console.log('yarn https proxy set success', ret)

    ret = await winExec(`yarn config set ca ${config.getDefaultCAKeyPath()}`)
    console.log('yarn cafile set success', ret)

    // ret = await winExec('yarn config set strict-ssl false')
    // console.log('yarn strict-ssl false success', ret)
  }

  static async unsetProxy () {
    await winExec('yarn config  delete proxy')
    console.log('yarn https proxy unset success')
    await winExec('yarn config  delete https-proxy')
    console.log('yarn https proxy unset success')

    await winExec('yarn config  delete ca')
    console.log('yarn cafile unset success')

    // await winExec(' yarn config delete strict-ssl')
    // console.log('yarn strict-ssl true success')
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
