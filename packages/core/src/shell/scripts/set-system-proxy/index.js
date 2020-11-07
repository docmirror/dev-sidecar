/**
 * 获取环境变量
 */
const Shell = require('../../shell')
const execute = Shell.execute
const Registry = require('winreg')
// const cmd = require('node-cmd')
const refreshInternetPs = require('./refresh-internet')
const PowerShell = require('node-powershell')

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

async function _winUnsetProxy (exec) {
  const regKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
  })

  await Promise.all([
    _winAsyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 0),
    _winAsyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, '')
  ])

  await exec([refreshInternetPs], { type: 'ps' })
  return true
}

async function _winSetProxy (exec, ip, port) {
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
    _winAsyncRegSet(regKey, 'MigrateProxy', Registry.REG_DWORD, 1),
    _winAsyncRegSet(regKey, 'ProxyEnable', Registry.REG_DWORD, 1),
    _winAsyncRegSet(regKey, 'ProxyHttp1.1', Registry.REG_DWORD, 0),
    _winAsyncRegSet(regKey, 'ProxyServer', Registry.REG_SZ, `${ip}:${port}`),
    _winAsyncRegSet(regKey, 'ProxyOverride', Registry.REG_SZ, lanIpStr)
  ])
  console.log('---代理设置成功，等待refresh------')
  await exec([refreshInternetPs])
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

async function _winResetWininetProxySettings (script) {
  const ps = new PowerShell({
    executionPolicy: 'Bypass',
    noProfile: true
  })
  ps.addCommand(script)

  try {
    const ret = await ps.invoke()
    console.log('ps complete', script)
    return ret
  } finally {
    ps.dispose()
  }
}

const executor = {
  async windows (exec, params) {
    if (params == null) {
      // 清空代理
      console.log('关闭代理')
      return _winUnsetProxy(exec)
    } else {
      // 设置代理
      const { ip, port } = params
      console.log('设置代理', ip, port)
      return _winSetProxy(exec, ip, port)
    }
  },
  async linux (exec, { port }) {
    throw Error('暂未实现此功能')
  },
  async mac (exec, { port }) {
    throw Error('暂未实现此功能')
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
