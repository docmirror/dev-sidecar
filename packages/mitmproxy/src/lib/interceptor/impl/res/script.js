const monkey = require('../../../monkey')
// const CryptoJs = require('crypto-js')
const lodash = require('lodash')
const log = require('../../../../utils/util.log')

const SCRIPT_URL_PRE = '/____ds_script____/' // 内置脚本的请求地址前缀
const SCRIPT_PROXY_URL_PRE = '/____ds_script_proxy____/' // 绝对地址脚本的伪脚本地址前缀
const REMOVE = '[remove]' // 标记需要移除的头信息

function getScript (key, script) {
  const scriptUrl = SCRIPT_URL_PRE + key
  // const hash = CryptoJs.SHA256(script).toString(CryptoJs.enc.Base64)
  // return `<script crossorigin="anonymous" defer="defer" type="application/javascript" src="${scriptUrl}" integrity="sha256-${hash}"></script>`
  return `<script crossorigin="anonymous" defer="defer" type="application/javascript" src="${scriptUrl}"></script>`
}
function getScriptByUrlOrPath (scriptUrlOrPath) {
  return `<script crossorigin="anonymous" defer="defer" type="application/javascript" src="${scriptUrlOrPath}"></script>`
}

module.exports = {
  name: 'script',
  priority: 203,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log, setting } = context

    // github特殊处理
    if (rOptions.hostname === 'github.com' && rOptions.headers['turbo-frame'] === 'repo-content-turbo-frame') {
      return
    }

    let keys = interceptOpt.script
    if (typeof keys === 'string') {
      keys = [keys]
    }
    try {
      // 内置脚本列表
      const scripts = monkey.get(setting.script.dirAbsolutePath)

      let tags = ''
      for (const key of keys) {
        if (key === 'global' || key === 'tampermonkey') {
          continue
        }

        let scriptTag

        if (key.indexOf('/') >= 0) {
          scriptTag = getScriptByUrlOrPath(key) // 1.绝对地址或相对地址（注意：当目标站点限制跨域脚本时，可使用相对地址，再结合proxy拦截器进行代理，可规避掉限制跨域脚本问题。）
        } else {
          const script = scripts[key]
          if (script == null) {
            continue
          }
          scriptTag = getScript(key, script.script) // 2.DS内置脚本
        }

        tags += '\r\n\t' + scriptTag
      }

      // 如果脚本为空，则不插入
      if (tags === '') {
        return
      }

      // 插入油猴脚本浏览器扩展
      tags = '\r\n\t' + getScript('tampermonkey', scripts.tampermonkey.script) + tags

      res.setHeader('DS-Script-Interceptor', 'true')
      log.info('script response intercept: insert script', rOptions.hostname, rOptions.path, ', head:', tags)
      return {
        head: tags + '\r\n'
      }
    } catch (err) {
      try {
        res.setHeader('DS-Script-Interceptor', 'error')
      } catch (e) {
        // ignore
      }
      log.error('load monkey script error', err)
    }
  },
  is (interceptOpt) {
    return interceptOpt.script
  },
  // 处理拦截配置：自动生成script拦截器所需的辅助配置，降低使用`script拦截器`配置绝对地址和相对地址时的门槛
  handleScriptInterceptConfig (intercepts) {
    // 为了简化 script 拦截器配置脚本绝对地址，这里特殊处理一下
    for (const hostnamePattern in intercepts) {
      const hostnameConfig = intercepts[hostnamePattern]

      const scriptProxy = {}
      for (const pathPattern in hostnameConfig) {
        const pathConfig = hostnameConfig[pathPattern]
        if (typeof pathConfig.script === 'object' && pathConfig.script.length > 0) {
          for (let i = 0; i < pathConfig.script.length; i++) {
            const script = pathConfig.script[i]
            if (script.indexOf('https:') === 0 || script.indexOf('http:') === 0) {
              // 绝对地址
              const scriptKey = SCRIPT_PROXY_URL_PRE + script.replace('.js', '').replace(/[\W_]+/g, '_') + '.js' // 伪脚本地址：移除 script 中可能存在的特殊字符，并转为相对地址
              scriptProxy[scriptKey] = script
              log.info(`替换script配置值：'${pathConfig.script[i]}' -> '${scriptKey}'`)
              pathConfig.script[i] = scriptKey
            } else if (script.indexOf('/') === 0) {
              // 相对地址
              scriptProxy[script] = script
            }
          }
        }
      }

      // 自动创建脚本
      if (!lodash.isEmpty(scriptProxy)) {
        for (const scriptKey in scriptProxy) {
          if (scriptKey.indexOf(SCRIPT_PROXY_URL_PRE) === 0) {
            // 绝对地址：新增代理配置
            const scriptUrl = scriptProxy[scriptKey]

            const pathPattern = `^${scriptKey.replace(/\./g, '\\.')}$`
            if (hostnameConfig[pathPattern]) {
              continue // 配置已经存在，按自定义配置优先
            }
            hostnameConfig[pathPattern] = {
              proxy: scriptUrl,
              // 移除部分请求头，避免触发目标站点的拦截策略
              requestReplace: {
                headers: {
                  host: REMOVE,
                  referer: REMOVE,
                  cookie: REMOVE
                }
              },
              // 替换和移除部分响应头，避免触发目标站点的阻止脚本加载策略
              responseReplace: {
                headers: {
                  'content-type': 'application/javascript; charset=utf-8',
                  'set-cookie': REMOVE,
                  server: REMOVE
                }
              },
              cacheDays: 7,
              desc: "为伪脚本文件设置代理地址，并设置响应头 `content-type: 'application/javascript; charset=utf-8'`，同时缓存7天。"
            }

            const obj = {}
            obj[pathPattern] = hostnameConfig[pathPattern]
            log.info(`域名 '${hostnamePattern}' 拦截配置中，新增伪脚本地址的代理配置:`, JSON.stringify(obj, null, '\t'))
          } else {
            // 相对地址：新增响应头Content-Type替换配置
            if (hostnameConfig[scriptKey]) {
              continue // 配置已经存在，按自定义配置优先
            }

            hostnameConfig[scriptKey] = {
              responseReplace: {
                headers: {
                  'content-type': 'application/javascript; charset=utf-8'
                }
              },
              cacheDays: 7,
              desc: "为脚本设置响应头 `content-type: 'application/javascript; charset=utf-8'`，同时缓存7天。"
            }

            const obj = {}
            obj[scriptKey] = hostnameConfig[scriptKey]
            log.info(`域名 '${hostnamePattern}' 拦截配置中，新增目标脚本地址的响应头替换配置:`, JSON.stringify(obj, null, '\t'))
          }
        }
      }
    }
  }
}
