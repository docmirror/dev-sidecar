/**
 * 获取环境变量
 */
const Shell = require('../../shell')
const execute = Shell.execute
const execFile = Shell.execFile
const Registry = require('winreg')
const refreshInternetPs = require('./refresh-internet')
const PowerShell = require('node-powershell')
const log = require('../../../utils/util.log')
const path = require('path')
const childProcess = require('child_process')
const util = require('util')
const _exec = util.promisify(childProcess.exec)
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
  '192.168.*'
]

async function _winUnsetProxy (exec) {
  // eslint-disable-next-line no-constant-condition
  if (true) {
    const proxyPath = getProxyExePath()
    await execFile(proxyPath, ['set', '1'])
    return
  }
  const regKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
  })

  await Promise.all([
    _winAsyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 0),
    _winAsyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, '')
  ])
  log.info('代理关闭成功，等待refresh')
  await exec(['echo "do refresh"', refreshInternetPs], { type: 'ps' })
  log.info('代理关闭refresh完成')
  return true
}

function getProxyExePath () {
  const proxyPath = process.env.DS_SYSPROXY_PATH
  log.info('proxyPath', proxyPath)
  if (proxyPath) {
    return proxyPath
  }
  return path.join(__dirname, './sysproxy.exe')
}

async function _winSetProxy (exec, ip, port) {
  let lanIpStr = ''
  for (const string of _lanIP) {
    lanIpStr += string + ';'
  }
  // eslint-disable-next-line no-constant-condition
  if (true) {
    const proxyPath = getProxyExePath()
    await execFile(proxyPath, ['global', `${ip}:${port}`, lanIpStr])
    return
  }
  const regKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
  })

  // log.info('lanIps:', lanIpStr, ip, port)
  await Promise.all([
    _winAsyncRegSet(regKey, 'MigrateProxy', Registry.REG_DWORD, 1),
    _winAsyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 1),
    _winAsyncRegSet(regKey, 'ProxyHttp1.1', Registry.REG_DWORD, 0),
    _winAsyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, `${ip}:${port}`),
    _winAsyncRegSet(regKey, 'ProxyOverride', Registry.REG_SZ, lanIpStr)
  ])
  log.info('代理设置成功，等待refresh')
  await exec(['echo "do refresh"', refreshInternetPs], { type: 'ps' })
  log.info('代理设置refresh完成')
  return true
}

function _winAsyncRegSet (regKey, name, type, value) {
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

const executor = {
  async windows (exec, params) {
    if (params == null) {
      // 清空代理
      log.info('关闭代理')
      return _winUnsetProxy(exec)
    } else {
      // 设置代理
      const { ip, port } = params
      log.info('设置代理', ip, port)
      return _winSetProxy(exec, ip, port)
    }
  },
  async linux (exec, params) {
    throw Error('暂未实现此功能')
  },
  async mac (exec, params) {
    // exec = _exec
    let wifiAdaptor = await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 "')
    wifiAdaptor = wifiAdaptor.trim()
    wifiAdaptor = wifiAdaptor.substring(wifiAdaptor.indexOf(' ')).trim()

    if (params == null) {
      await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)
      await exec(`networksetup -setsecurewebproxystate '${wifiAdaptor}' off`)
    } else {
      const { ip, port } = params
      await exec(`networksetup -setwebproxy '${wifiAdaptor}' ${ip} ${port}`)
      await exec(`networksetup -setsecurewebproxy '${wifiAdaptor}' ${ip} ${port}`)
    }
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
