/**
 * 获取环境变量
 */
const Shell = require('../../shell')
const Registry = require('winreg')

const execute = Shell.execute
const execFile = Shell.execFile
const log = require('../../../utils/util.log')
const extraPath = require('../extra-path/index')

let config = null

async function _winUnsetProxy (exec, setEnv) {
  // eslint-disable-next-line no-constant-condition
  const proxyPath = extraPath.getProxyExePath()
  await execFile(proxyPath, ['set', '1'])

  try {
    await exec('echo \'test\'')
    const regKey = new Registry({ // new operator is optional
      hive: Registry.HKCU, // open registry hive HKEY_CURRENT_USER
      key: '\\Environment' // key containing autostart programs
    })
    regKey.get('HTTPS_PROXY', (err) => {
      if (!err) {
        regKey.remove('HTTPS_PROXY', async (err) => {
          log.warn('删除环境变量https_proxy失败:', err)
          await exec('setx DS_REFRESH "1"')
        })
      }
    })
  } catch (e) {
    log.error('启动系统代理失败:', e)
  }
}

async function _winSetProxy (exec, ip, port, setEnv) {
  // 延迟加载config
  if (config == null) {
    config = require('../../../config.js')
  }

  let excludeIpStr = ''
  for (const ip in config.get().proxy.excludeIpList) {
    if (config.get().proxy.excludeIpList[ip] === true) {
      excludeIpStr += ip + ';'
    }
  }

  const proxyPath = extraPath.getProxyExePath()
  const execFun = 'global'

  // https
  let proxyAddr = `https=http://${ip}:${port}`
  // http
  if (config.get().proxy.proxyHttp) {
    proxyAddr = `http=http://${ip}:${port};` + proxyAddr
  }

  log.info(`执行“设置系统代理”的程序: ${proxyPath} ${execFun} ${proxyAddr} ......(省略排除IP列表)`)
  await execFile(proxyPath, [execFun, proxyAddr, excludeIpStr])

  if (setEnv) {
    log.info('同时设置 https_proxy')
    try {
      await exec('echo \'test\'')
      await exec('echo \'test\'')
      await exec(`setx HTTPS_PROXY "http://${ip}:${port}/"`)
      //  await addClearScriptIni()
    } catch (e) {
      log.error(e)
    }
  }

  return true
}

const executor = {
  async windows (exec, params = {}) {
    const { ip, port, setEnv } = params
    if (ip == null) {
      // 清空代理
      log.info('关闭windows系统代理')
      return _winUnsetProxy(exec, setEnv)
    } else {
      // 设置代理
      log.info('设置windows系统代理:', ip, port, setEnv)
      return _winSetProxy(exec, ip, port, setEnv)
    }
  },
  async linux (exec, params = {}) {
    const { ip, port } = params
    if (ip != null) {
      // const local = 'localhost, 127.0.0.0/8, ::1'

      // https
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode manual',
        'gsettings set org.gnome.system.proxy.https enabled true',
        `gsettings set org.gnome.system.proxy.https port ${port}`,
        `gsettings set org.gnome.system.proxy.https host ${ip}`
      ]
      // http
      if (config.get().proxy.proxyHttp) {
        setProxyCmd[setProxyCmd.length] = 'gsettings set org.gnome.system.proxy.http enabled true'
        setProxyCmd[setProxyCmd.length] = `gsettings set org.gnome.system.proxy.http port ${port}`
        setProxyCmd[setProxyCmd.length] = `gsettings set org.gnome.system.proxy.http host ${ip}`
      } else {
        setProxyCmd[setProxyCmd.length] = 'gsettings set org.gnome.system.proxy.http enabled false'
      }
      // ignore-hosts
      // setProxyCmd[setProxyCmd.length] = `gsettings set org.gnome.system.proxy ignore-hosts "${local}"`

      await exec(setProxyCmd)
    } else {
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode none'
      ]
      await exec(setProxyCmd)
    }
  },
  async mac (exec, params = {}) {
    // exec = _exec
    let wifiAdaptor = await exec('sh -c "networksetup -listnetworkserviceorder | grep `route -n get 0.0.0.0 | grep \'interface\' | cut -d \':\' -f2` -B 1 | head -n 1 "')
    wifiAdaptor = wifiAdaptor.trim()
    wifiAdaptor = wifiAdaptor.substring(wifiAdaptor.indexOf(' ')).trim()
    const { ip, port } = params
    if (ip == null) {
      // https
      await exec(`networksetup -setsecurewebproxystate '${wifiAdaptor}' off`)
      // http
      await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)

      // const removeEnv = `
      // sed -ie '/export http_proxy/d' ~/.zshrc
      // sed -ie '/export https_proxy/d' ~/.zshrc
      // source ~/.zshrc
      // `
      // await exec(removeEnv)
    } else {
      // https
      await exec(`networksetup -setsecurewebproxy '${wifiAdaptor}' ${ip} ${port}`)
      // http
      if (config.get().proxy.proxyHttp) {
        await exec(`networksetup -setwebproxy '${wifiAdaptor}' ${ip} ${port}`)
      } else {
        await exec(`networksetup -setwebproxystate '${wifiAdaptor}' off`)
      }

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
