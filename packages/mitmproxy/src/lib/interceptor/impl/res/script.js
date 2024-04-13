const contextPath = '/____ds_script____/'
const monkey = require('../../../monkey')
const CryptoJs = require('crypto-js')
function getScript (key, script) {
  const scriptUrl = contextPath + key

  const hash = CryptoJs.SHA256(script).toString(CryptoJs.enc.Base64)
  return `<script crossorigin="anonymous" defer="defer" type="application/javascript" src="${scriptUrl}" integrity="sha256-${hash}"></script>`
}
function getScriptByUrlOrPath (scriptUrlOrPath) {
  return `<script crossorigin="anonymous" defer="defer" type="application/javascript" src="${scriptUrlOrPath}"></script>`
}

module.exports = {
  name: 'script',
  priority: 202,
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
      const scripts = monkey.get(setting.script.dirAbsolutePath)
      let tags = '\r\n\t' + getScript('global', scripts.global.script)
      for (const key of keys) {
        let scriptTag

        if (key.indexOf('/') >= 0) {
          scriptTag = getScriptByUrlOrPath(key) // 1.绝对地址或相对地址（注意：当目标站点限制跨域脚本资源的情况下，可以使用相对地址，再结合proxy.js进行代理，可规避掉跨域限制问题。）
        } else {
          const script = scripts[key]
          if (script == null) {
            continue
          }
          scriptTag = getScript(key, script.script) // 2.DS内置脚本
        }

        tags += '\r\n\t' + scriptTag
      }
      res.setHeader('DS-Script-Interceptor', 'true')
      log.info('script response intercept: insert script', rOptions.hostname, rOptions.path, ', head:', tags)
      return {
        head: tags + '\r\n'
      }
    } catch (err) {
      res.setHeader('DS-Script-Interceptor', 'error')
      log.error('load monkey script error', err)
    }
  },
  is (interceptOpt) {
    return interceptOpt.script
  }
}
