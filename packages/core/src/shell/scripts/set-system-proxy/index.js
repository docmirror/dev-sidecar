/**
 * 获取环境变量
 */
const fs = require('node:fs')
const path = require('node:path')
const request = require('request')
const Registry = require('winreg')
const log = require('../../../utils/util.log')
const Shell = require('../../shell')

const execute = Shell.execute

let config = null
function loadConfig () {
  if (config == null) {
    config = require('../../../config.js')
  }
}

function getDomesticDomainAllowListTmpFilePath () {
  return path.join(config.get().server.setting.userBasePath, '/domestic-domain-allowlist.txt')
}

async function downloadDomesticDomainAllowListAsync () {
  loadConfig()

  const remoteFileUrl = config.get().proxy.remoteDomesticDomainAllowListFileUrl
  log.info('开始下载远程 domestic-domain-allowlist.txt 文件:', remoteFileUrl)
  request(remoteFileUrl, (error, response, body) => {
    if (error) {
      log.error(`下载远程 domestic-domain-allowlist.txt 文件失败: ${remoteFileUrl}, error:`, error, ', response:', response, ', body:', body)
      return
    }
    if (response && response.statusCode === 200) {
      if (body == null || body.length < 100) {
        log.warn('下载远程 domestic-domain-allowlist.txt 文件成功，但内容为空或内容太短，判断为无效的 domestic-domain-allowlist.txt 文件:', remoteFileUrl, ', body:', body)
        return
      } else {
        log.info('下载远程 domestic-domain-allowlist.txt 文件成功:', remoteFileUrl)
      }

      let fileTxt = body
      try {
        if (!fileTxt.includes('*.')) {
          fileTxt = Buffer.from(fileTxt, 'base64').toString('utf8')
          // log.debug('解析 base64 后的 domestic-domain-allowlist:', fileTxt)
        }
      } catch (e) {
        if (!fileTxt.includes('*.')) {
          log.error(`远程 domestic-domain-allowlist.txt 文件内容即不是base64格式，也不是要求的格式，url: ${remoteFileUrl}，body: ${body}`)
          return
        }
      }

      // 保存到本地
      saveDomesticDomainAllowListFile(fileTxt)
    } else {
      log.error(`下载远程 domestic-domain-allowlist.txt 文件失败: ${remoteFileUrl}, response:`, response, ', body:', body)
    }
  })
}

function loadLastModifiedTimeFromTxt (fileTxt) {
  const matched = fileTxt.match(/(?<=; Update Date: )[^\r\n]+/g)
  if (matched && matched.length > 0) {
    try {
      return new Date(matched[0])
    } catch {
      return null
    }
  }
}

// 保存 国内域名白名单 内容到 `~/domestic-domain-allowlist.txt` 文件中
function saveDomesticDomainAllowListFile (fileTxt) {
  const filePath = getDomesticDomainAllowListTmpFilePath()
  fs.writeFileSync(filePath, fileTxt.replaceAll(/\r\n?/g, '\n'))
  log.info('保存 domestic-domain-allowlist.txt 文件成功:', filePath)

  // 尝试解析和修改 domestic-domain-allowlist.txt 文件时间
  const lastModifiedTime = loadLastModifiedTimeFromTxt(fileTxt)
  if (lastModifiedTime) {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        log.error('修改 domestic-domain-allowlist.txt 文件时间失败:', err)
        return
      }

      // 修改文件的访问时间和修改时间为当前时间
      fs.utimes(filePath, lastModifiedTime, lastModifiedTime, (utimesErr) => {
        if (utimesErr) {
          log.error('修改 domestic-domain-allowlist.txt 文件时间失败:', utimesErr)
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

function getDomesticDomainAllowList () {
  loadConfig()

  if (!config.get().proxy.excludeDomesticDomainAllowList) {
    return null
  }

  // 判断是否需要自动更新国内域名
  let fileAbsolutePath = config.get().proxy.domesticDomainAllowListFileAbsolutePath
  if (!fileAbsolutePath && config.get().proxy.autoUpdateDomesticDomainAllowList) {
    // 异步下载，下载成功后，下次系统代理生效
    downloadDomesticDomainAllowListAsync().then()
  }

  // 加载本地文件
  if (!fileAbsolutePath) {
    const tmpFilePath = getDomesticDomainAllowListTmpFilePath()
    if (fs.existsSync(tmpFilePath)) {
      // 如果临时文件已存在，则使用临时文件
      fileAbsolutePath = tmpFilePath
      log.info('读取已下载的 domestic-domain-allowlist.txt 文件:', fileAbsolutePath)
    } else {
      // 如果临时文件不存在，则使用内置文件
      log.info('__dirname:', __dirname)
      fileAbsolutePath = path.join(__dirname, '../', config.get().proxy.domesticDomainAllowListFilePath)
      log.info('读取内置的 domestic-domain-allowlist.txt 文件:', fileAbsolutePath)
    }
  } else {
    log.info('读取自定义路径的 domestic-domain-allowlist.txt 文件:', fileAbsolutePath)
  }

  try {
    return fs.readFileSync(fileAbsolutePath).toString()
  } catch (e) {
    log.error(`读取 domestic-domain-allowlist.txt 文件失败: ${fileAbsolutePath}, error:`, e)
    return null
  }
}

function getProxyExcludeIpStr (split) {
  let excludeIpStr = ''
  for (const ip in config.get().proxy.excludeIpList) {
    if (config.get().proxy.excludeIpList[ip] === true) {
      excludeIpStr += ip + split
    }
  }

  // 排除国内域名
  if (config.get().proxy.excludeDomesticDomainAllowList) {
    try {
      let domesticDomainAllowList = getDomesticDomainAllowList()
      if (domesticDomainAllowList) {
        domesticDomainAllowList = (`${domesticDomainAllowList}\n`).replaceAll(/[\r\n]+/g, '\n').replaceAll(/[\d*\-.A-Z]*[^\d\n*\-.A-Z][^\n]*\n/gi, '').trim().replaceAll(/\s*\n\s*/g, split)
        if (domesticDomainAllowList) {
          excludeIpStr += domesticDomainAllowList
          log.info('系统代理排除列表拼接国内域名')
        } else {
          log.info('国内域名为空，不进行系统代理排除列表拼接国内域名')
        }
      }
    } catch (e) {
      log.error('系统代理排除列表拼接国内域名失败:', e)
    }
  }

  log.debug('系统代理排除域名（excludeIpStr）:', excludeIpStr)

  return excludeIpStr
}

const executor = {
  async windows (exec, params = {}) {
    const sysproxy = require('@mihomo-party/sysproxy')

    const { ip, port, setEnv } = params
    if (ip != null) { // 设置代理
      // 延迟加载config
      loadConfig()
      log.info('设置windows系统代理:', ip, port, setEnv)
      // 读取排除域名
      const excludeIpStr = getProxyExcludeIpStr(';')

      sysproxy.triggerManualProxy(true, ip, port, excludeIpStr)

      if (setEnv) {
        // 设置全局代理所需的环境变量
        try {
          await exec(`echo '设置环境变量 HTTPS_PROXY${config.get().proxy.proxyHttp ? '、HTTP_PROXY' : ''}'`)

          log.info(`开启系统代理的同时设置环境变量：HTTPS_PROXY = "http://${ip}:${port}/"`)
          await exec(`setx HTTPS_PROXY "http://${ip}:${port}/"`)

          if (config.get().proxy.proxyHttp) {
            log.info(`开启系统代理的同时设置环境变量：HTTP_PROXY = "http://${ip}:${port - 1}/"`)
            await exec(`setx HTTP_PROXY "http://${ip}:${port - 1}/"`)
          }

          //  await addClearScriptIni()
        } catch (e) {
          log.error('设置环境变量 HTTPS_PROXY、HTTP_PROXY 失败:', e)
        }
      }

      return true
    } else { // 关闭代理
      log.info('关闭windows系统代理')
      sysproxy.triggerManualProxy(false, '', 0, '')

      try {
        await exec('echo \'删除环境变量 HTTPS_PROXY、HTTP_PROXY\'')
        const regKey = new Registry({ // new operator is optional
          hive: Registry.HKCU, // open registry hive HKEY_CURRENT_USER
          key: '\\Environment', // key containing autostart programs
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

      return true
    }
  },
  async linux (exec, params = {}) {
    const { ip, port } = params
    if (ip != null) { // 设置代理
      // 延迟加载config
      loadConfig()

      // https
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode manual',
        `gsettings set org.gnome.system.proxy.https host ${ip}`,
        `gsettings set org.gnome.system.proxy.https port ${port}`,
      ]
      // http
      if (config.get().proxy.proxyHttp) {
        setProxyCmd.push(`gsettings set org.gnome.system.proxy.http host ${ip}`)
        setProxyCmd.push(`gsettings set org.gnome.system.proxy.http port ${port - 1}`)
      } else {
        setProxyCmd.push('gsettings set org.gnome.system.proxy.http host \'\'')
        setProxyCmd.push('gsettings set org.gnome.system.proxy.http port 0')
      }

      // 设置排除域名（ignore-hosts）
      const excludeIpStr = getProxyExcludeIpStr('\', \'')
      setProxyCmd.push(`gsettings set org.gnome.system.proxy ignore-hosts "['${excludeIpStr}']"`)

      await exec(setProxyCmd)
    } else { // 关闭代理
      const setProxyCmd = [
        'gsettings set org.gnome.system.proxy mode none',
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
      await exec(`networksetup -setsecurewebproxy "${wifiAdaptor}" ${ip} ${port}`)
      // http
      if (config.get().proxy.proxyHttp) {
        await exec(`networksetup -setwebproxy "${wifiAdaptor}" ${ip} ${port - 1}`)
      } else {
        await exec(`networksetup -setwebproxystate "${wifiAdaptor}" off`)
      }

      // 设置排除域名
      const excludeIpStr = getProxyExcludeIpStr('" "')
      await exec(`networksetup -setproxybypassdomains "${wifiAdaptor}" "${excludeIpStr}"`)

      // const setEnv = `cat <<ENDOF >>  ~/.zshrc
      // export http_proxy="http://${ip}:${port}"
      // export https_proxy="http://${ip}:${port}"
      // ENDOF
      // source ~/.zshrc
      // `
      // await exec(setEnv)
    } else { // 关闭代理
      // https
      await exec(`networksetup -setsecurewebproxystate "${wifiAdaptor}" off`)
      // http
      await exec(`networksetup -setwebproxystate "${wifiAdaptor}" off`)

      // const removeEnv = `
      // sed -ie '/export http_proxy/d' ~/.zshrc
      // sed -ie '/export https_proxy/d' ~/.zshrc
      // source ~/.zshrc
      // `
      // await exec(removeEnv)
    }
  },
}

module.exports = async function (args) {
  return execute(executor, args)
}
