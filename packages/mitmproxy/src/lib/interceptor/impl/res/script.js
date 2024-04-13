const contextPath = '/____ds_script____/'
const monkey = require('../../../monkey')
const CryptoJs = require('crypto-js')
function getScript (key, script) {
  const scriptUrl = contextPath + key

  const hash = CryptoJs.SHA256(script).toString(CryptoJs.enc.Base64)
  return `
      <script src="${scriptUrl}" type="application/javascript" crossorigin="anonymous" defer integrity="sha256-${hash}"></script>
`
}
function getScriptByAbsoluteUrl (scriptUrl) {
  return `
      <script src="${scriptUrl}" type="application/javascript" crossorigin="anonymous" defer></script>
`
}

module.exports = {
  name: 'script',
  priority: 202,
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log, setting } = context
    let keys = interceptOpt.script
    if (typeof keys === 'string') {
      keys = [keys]
    }
    try {
      const scripts = monkey.get(setting.script.dirAbsolutePath)
      let tags = getScript('global', scripts.global.script)
      for (const key of keys) {
        let scriptTag

        if (key.indexOf('http:') === 0 || key.indexOf('https:') === 0) {
          scriptTag = getScriptByAbsoluteUrl(key)
        } else {
          const script = scripts[key]
          if (script == null) {
            continue
          }
          scriptTag = getScript(key, script.script)
        }

        tags += '\r\n' + scriptTag
      }
      res.setHeader('DS-Script-Interceptor', 'true')
      log.info('script response intercept: insert script', rOptions.hostname, rOptions.path, ', head:', tags)
      return {
        head: tags
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
