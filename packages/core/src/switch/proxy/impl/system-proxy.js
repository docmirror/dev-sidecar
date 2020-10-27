const util = require('util')
const os = require('os')
const childProcess = require('child_process')
const _exec = childProcess.exec
const Registry = require('winreg')
// const cmd = require('node-cmd')
const exec = util.promisify(_exec)
const refreshInternetPs = require('./refresh-internet')
const Shell = require('node-powershell')

const _lanIP = [
  'localhost',
  '127.*',
  '10.*',
  '172.16.*',
  '172.17.*',
  '172.18.*',
  '172.19.*',
  '172.20.*',
  '172.21.*',
  '172.22.*',
  '172.23.*',
  '172.24.*',
  '172.25.*',
  '172.26.*',
  '172.27.*',
  '172.28.*',
  '172.29.*',
  '172.30.*',
  '172.31.*',
  '192.168.*',
  '<local>'
]

class SystemProxy {
  static async setProxy (ip, port) {
    throw new Error('You have to implement the method setProxy!')
  }

  static async unsetProxy () {
    throw new Error('You have to implement the method unsetProxy!')
  }
}

// TODO: Add path http_proxy and https_proxy
// TODO: Support for non-gnome
class LinuxSystemProxy extends SystemProxy {
  static async setProxy (ip, port) {
    await exec('gsettings set org.gnome.system.proxy mode manual')
    await exec(`gsettings set org.gnome.system.proxy.http host ${ip}`)
    await exec(`gsettings set org.gnome.system.proxy.http port ${port}`)
  }

  static async unsetProxy () {
    await exec('gsettings set org.gnome.system.proxy mode none')
  }
}

// TODO: Support for lan connections too
// TODO: move scripts to ../scripts/darwin
class DarwinSystemProxy extends SystemProxy {
  static async setProxy (ip, port) {
    const wifiAdaptor = (await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 | cut -d \' \' -f2"')).stdout.trim()

    await exec(`networksetup -setwebproxy '${wifiAdaptor}' ${ip} ${port}`)
    await exec(`networksetup -setsecurewebproxy '${wifiAdaptor}' ${ip} ${port}`)
  }

  static async unsetProxy () {
    const wifiAdaptor = (await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 | cut -d \' \' -f2"')).stdout.trim()

    await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)
    await exec(`networksetup -setsecurewebproxystate '${wifiAdaptor}' off`)
  }
}

class WindowsSystemProxy extends SystemProxy {
  static async setProxy (ip, port) {
    const regKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    })

    let lanIpStr = ''
    for (const string of _lanIP) {
      lanIpStr += string + ';'
    }
    // console.log('lanIps:', lanIpStr, ip, port)
    await Promise.all([
      WindowsSystemProxy._asyncRegSet(regKey, 'MigrateProxy', Registry.REG_DWORD, 1),
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 1),
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyHttp1.1', Registry.REG_DWORD, 0),
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, `${ip}:${port}`),
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyOverride', Registry.REG_SZ, lanIpStr)
    ])
    await WindowsSystemProxy._resetWininetProxySettings('echo refreshing') // 要执行以下这个才能生效
    await WindowsSystemProxy._resetWininetProxySettings(refreshInternetPs)
  }

  static async unsetProxy () {
    const regKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    })

    await Promise.all([
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 0),
      WindowsSystemProxy._asyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, '')
    ])
    await WindowsSystemProxy._resetWininetProxySettings(refreshInternetPs)
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

  static _resetWininetProxySettings (script) {
    return new Promise((resolve, reject) => {
      const ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
      })
      // ps.addCommand(setproxyPs)
      // ps.addCommand(`Set-InternetProxy -Proxy "${ip}:${port}"`)

      ps.addCommand(script)

      ps.invoke()
        .then(output => {
          console.log(output)
          resolve()
        })
        .catch(err => {
          console.log(err)
          reject(err)
        })

      // const scriptPath = path.join(__dirname, '..', 'scripts', 'windows', 'wininet-reset-settings.ps1')
      // const child = spawn('powershell.exe', [scriptPath])
      // child.stdout.setEncoding('utf8')
      // child.stdout.on('data', (data) => {
      //   console.log('data', data)
      //   if (data.includes('True')) {
      //     resolve()
      //   } else {
      //     reject(data)
      //   }
      // })
      //
      // child.stderr.on('data', (err) => {
      //   console.log('data', err)
      //   reject(err)
      // })
      //
      // child.stdin.end()
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
  async  setProxy (ip, port) {
    const systemProxy = getSystemProxy()
    await systemProxy.setProxy(ip, port)
  },
  async  unsetProxy () {
    const systemProxy = getSystemProxy()
    await systemProxy.unsetProxy()
  }
}
