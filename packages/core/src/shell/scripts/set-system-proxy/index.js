/**
 * 获取环境变量
 */
const Shell = require('../../shell')
const Registry = require('winreg')

const execute = Shell.execute
const execFile = Shell.execFile
const log = require('../../../utils/util.log')
const extraPath = require('../extra-path/index')
const fs = require('fs')
const path = require('path')
const request = require('request')

let config = null
function loadConfig () {
  if (config == null) {
    config = require('../../../config.js')
  }
}

async function _winUnsetProxy (exec, setEnv) {
  // eslint-disable-next-line no-constant-condition
  const proxyPath = extraPath.getProxyExePath()
  await execFile(proxyPath, ['set', '1'])

  try {
    await exec('echo \'删除环境变量 HTTPS_PROXY、HTTP_PROXY\'')
    const regKey = new Registry({ // new operator is optional
      hive: Registry.HKCU, // open registry hive HKEY_CURRENT_USER
      key: '\\Environment' // key containing autostart programs
    })
    regKey.get('HTTPS_PROXY', (err) => {
      if (!err) {
        regKey.remove('HTTPS_PROXY', async (err) => {
          log.warn('删除环境变量 HTTPS_PROXY 失败:', err)
          await exec('setx DS_REFRESH "1"')
        })
      }
    })
    regKey.get('HTTP_PROXY', (err) => {
      if (!err) {
        regKey.remove('HTTP_PROXY', async (err) => {
          log.warn('删除环境变量 HTTP_PROXY 失败:', err)
        })
      }
    })
  } catch (e) {
    log.error('删除环境变量 HTTPS_PROXY、HTTP_PROXY 失败:', e)
  }
}

function getChinaDomainAllowListTmpFilePath () {
  return path.join(config.get().server.setting.userBasePath, '/china-domain-allowlist.txt')
}

async function downloadChinaDomainAllowListAsync () {
  loadConfig()

  const remoteFileUrl = config.get().proxy.remoteChinaDomainAllowListFileUrl
  log.info('开始下载远程 china-domain-allowlist.txt 文件:', remoteFileUrl)
  request(remoteFileUrl, (error, response, body) => {
    if (error) {
      log.error('下载远程 china-domain-allowlist.txt 文件失败, error:', error, ', response:', response, ', body:', body)
      return
    }
    if (response && response.statusCode === 200) {
      if (body == null || body.length < 100) {
        log.warn('下载远程 china-domain-allowlist.txt 文件成功，但内容为空或内容太短，判断为无效的 china-domain-allowlist.txt 文件:', remoteFileUrl, ', body:', body)
        return
      } else {
        log.info('下载远程 china-domain-allowlist.txt 文件成功:', remoteFileUrl)
      }

      let fileTxt = body
      try {
        if (fileTxt.indexOf('*.') < 0) {
          fileTxt = Buffer.from(fileTxt, 'base64').toString('utf8')
          // log.debug('解析 base64 后的 china-domain-allowlist:', fileTxt)
        }
      } catch (e) {
        if (fileTxt.indexOf('*.') < 0) {
          log.error(`远程 china-domain-allowlist.txt 文件内容即不是base64格式，也不是要求的格式，url: ${remoteFileUrl}，body: ${body}`)
          return
        }
      }

      // 保存到本地
      saveChinaDomainAllowListFile(fileTxt)
    } else {
      log.error('下载远程 china-domain-allowlist.txt 文件失败, response:', response, ', body:', body)
    }
  })
}

function loadLastModifiedTimeFromTxt (fileTxt) {
  const matched = fileTxt.match(/(?<=; Update Date: )[^\r\n]+/g)
  if (matched && matched.length > 0) {
    try {
      return new Date(matched[0])
    } catch (ignore) {
      return null
    }
  }
}

// 保存 中国域名白名单 内容到 `~/china-domain-allowlist.txt.txt` 文件中
function saveChinaDomainAllowListFile (fileTxt) {
  const filePath = getChinaDomainAllowListTmpFilePath()
  fs.writeFileSync(filePath, fileTxt.replaceAll(/\r\n?/g, '\n'))
  log.info('保存 china-domain-allowlist.txt 文件成功:', filePath)

  // 尝试解析和修改 china-domain-allowlist.txt 文件时间
  const lastModifiedTime = loadLastModifiedTimeFromTxt(fileTxt)
  if (lastModifiedTime) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        log.error('修改 china-domain-allowlist.txt 文件时间失败:', err)
        return
      }

      // 修改文件的访问时间和修改时间为当前时间
      fs.utimes(filePath, lastModifiedTime, lastModifiedTime, (utimesErr) => {
        if (utimesErr) {
          log.error('修改 china-domain-allowlist.txt 文件时间失败:', utimesErr)
        } else {
          log.info(`'${filePath}' 文件的修改时间已更新为其最近更新时间 '${formatDate(lastModifiedTime)}'`)
        }
      })
    })
  }

  return filePath
}

function formatDate (date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getChinaDomainAllowList () {
  loadConfig()

  if (!config.get().proxy.excludeChinaDomainAllowList) {
    return null
  }

  // 判断是否需要自动更新中国域名
  let fileAbsolutePath = config.get().proxy.chinaDomainAllowListFileAbsolutePath
  if (!fileAbsolutePath && config.get().proxy.autoUpdateChinaDomainAllowList) {
    // 异步下载，下载成功后，下次系统代理生效
    downloadChinaDomainAllowListAsync().then()
  }

  // 加载本地文件
  if (!fileAbsolutePath) {
    const tmpFilePath = getChinaDomainAllowListTmpFilePath()
    if (fs.existsSync(tmpFilePath)) {
      // 如果临时文件已存在，则使用临时文件
      fileAbsolutePath = tmpFilePath
      log.info('读取已下载的 china-domain-allowlist.txt 文件:', fileAbsolutePath)
    } else {
      // 如果临时文件不存在，则使用内置文件
      fileAbsolutePath = path.join(__dirname, '../../gui/', config.get().proxy.chinaDomainAllowListFilePath)
      log.info('读取内置的 china-domain-allowlist.txt 文件:', fileAbsolutePath)
    }
  } else {
    log.info('读取自定义路径的 china-domain-allowlist.txt 文件:', fileAbsolutePath)
  }

  try {
    return fs.readFileSync(fileAbsolutePath).toString()
  } catch (e) {
    log.error('读取 china-domain-allowlist.txt 文件失败:', fileAbsolutePath)
    return null
  }
}

async function _winSetProxy (exec, ip, port, setEnv) {
  // 延迟加载config
  loadConfig()

  let excludeIpStr = ''
  for (const ip in config.get().proxy.excludeIpList) {
    if (config.get().proxy.excludeIpList[ip] === true) {
      excludeIpStr += ip + ';'
    }
  }

  // 排除中国域名
  if (config.get().proxy.excludeChinaDomainAllowList) {
    try {
      let chinaDomainAllowList = getChinaDomainAllowList()
      if (chinaDomainAllowList) {
        chinaDomainAllowList = (chinaDomainAllowList + '\n').replaceAll(/[\r\n]+/g, '\n').replaceAll(/[^\n]*[^*.a-zA-Z\d-\n]+[^\n]*\r?\n/g, '').replaceAll(/\s*\n+\s*/g, ';')
        if (chinaDomainAllowList) {
          excludeIpStr += chinaDomainAllowList
          log.info('系统代理排除列表拼接中国域名')
        } else {
          log.info('中国域名为空，不进行系统代理排除列表拼接中国域名')
        }
      }
    } catch (e) {
      log.error('系统代理排除列表拼接中国域名失败:', e)
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
    log.info(`开启系统代理的同时设置环境变量：HTTPS_PROXY = "http://${ip}:${port}/"`)
    if (config.get().proxy.proxyHttp) {
      log.info(`开启系统代理的同时设置环境变量：HTTP_PROXY = "http://${ip}:${port}/"`)
    }
    try {
      await exec('echo \'设置环境变量 HTTPS_PROXY、HTTP_PROXY\'')
      await exec(`setx HTTPS_PROXY "http://${ip}:${port}/"`)
      if (config.get().proxy.proxyHttp) {
        await exec(`setx HTTP_PROXY "http://${ip}:${port}/"`)
      }
      //  await addClearScriptIni()
    } catch (e) {
      log.error('设置环境变量 HTTPS_PROXY、HTTP_PROXY 失败:', e)
    }
  }

  return true
}

const executor = {
  async windows (exec, params = {}) {
    const { ip, port, setEnv } = params
    if (ip != null) { // 设置代理
      log.info('设置windows系统代理:', ip, port, setEnv)
      return _winSetProxy(exec, ip, port, setEnv)
    } else { // 关闭代理
      log.info('关闭windows系统代理')
      return _winUnsetProxy(exec, setEnv)
    }
  },
  async linux (exec, params = {}) {
    const { ip, port } = params
    if (ip != null) { // 设置代理
      // 延迟加载config
      loadConfig()

      // const local = 'localhost, 127.0.0.0/8, ::1'

      // https
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode manual',
        `gsettings set org.gnome.system.proxy.https host ${ip}`,
        `gsettings set org.gnome.system.proxy.https port ${port}`
      ]
      // http
      if (config.get().proxy.proxyHttp) {
        setProxyCmd.push(`gsettings set org.gnome.system.proxy.http host ${ip}`)
        setProxyCmd.push(`gsettings set org.gnome.system.proxy.http port ${port}`)
      } else {
        setProxyCmd.push("gsettings set org.gnome.system.proxy.http host ''")
        setProxyCmd.push('gsettings set org.gnome.system.proxy.http port 0')
      }
      // ignore-hosts
      // setProxyCmd.push(`gsettings set org.gnome.system.proxy ignore-hosts "${local}"`)

      await exec(setProxyCmd)
    } else { // 关闭代理
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
    if (ip != null) { // 设置代理
      // 延迟加载config
      loadConfig()

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
    } else { // 关闭代理
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
    }
  }
}

module.exports = async function (args) {
  return execute(executor, args)
}
