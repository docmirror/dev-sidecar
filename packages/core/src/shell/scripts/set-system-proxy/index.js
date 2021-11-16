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
const fs = require('fs')
const _exec = util.promisify(childProcess.exec)
const extraPath = require('../extra-path/index')
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
  '<-loopback>'
]

async function _winUnsetProxy (exec) {
  // eslint-disable-next-line no-constant-condition
  const proxyPath = extraPath.getProxyExePath()
  await execFile(proxyPath, ['set', '1'])
  try {
  //  await removeClearScriptIni()
  } catch (e) {
    log.error(e)
  }
}

async function _winSetProxy (exec, ip, port) {
  let lanIpStr = ''
  for (const string of _lanIP) {
    lanIpStr += string + ';'
  }
  const proxyPath = extraPath.getProxyExePath()
  await execFile(proxyPath, ['global', `${ip}:${port}`, lanIpStr])
  try {
  //  await addClearScriptIni()
  } catch (e) {
    log.error(e)
  }

  return true
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
    if (params != null) {
      const { ip, port } = params
      // const local = 'localhost, 127.0.0.0/8, ::1'

      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode manual',
        `gsettings set org.gnome.system.proxy.https port ${port}`,
        `gsettings set org.gnome.system.proxy.https host ${ip}`,
        `gsettings set org.gnome.system.proxy.http port ${port}`,
        `gsettings set org.gnome.system.proxy.http host ${ip}`
        // `gsettings set org.gnome.system.proxy ignore-hosts "${local}"`
      ]

      await exec(setProxyCmd)
    } else {
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode none'
      ]
      await exec(setProxyCmd)
    }
  },
  async mac (exec, params) {
    // exec = _exec
    let wifiAdaptor = await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 "')
    wifiAdaptor = wifiAdaptor.trim()
    wifiAdaptor = wifiAdaptor.substring(wifiAdaptor.indexOf(' ')).trim()

    if (params == null) {
      await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)
      await exec(`networksetup -setsecurewebproxystate '${wifiAdaptor}' off`)

      // const removeEnv = `
      // sed -ie '/export http_proxy/d' ~/.zshrc
      // sed -ie '/export https_proxy/d' ~/.zshrc
      // source ~/.zshrc
      // `
      // await exec(removeEnv)
    } else {
      const { ip, port } = params
      await exec(`networksetup -setwebproxy '${wifiAdaptor}' ${ip} ${port}`)
      await exec(`networksetup -setsecurewebproxy '${wifiAdaptor}' ${ip} ${port}`)

      //       const setEnv = `cat <<ENDOF >>  ~/.zshrc
      // export http_proxy="http://${ip}:${port}"
      // export https_proxy="http://${ip}:${port}"
      // ENDOF
      // source ~/.zshrc
      //       `
      //       await exec(setEnv)
    }
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
