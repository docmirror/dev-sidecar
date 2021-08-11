const contextPath = '/____ds_script____/'
const monkey = require('../../monkey')
const CryptoJs = require('crypto-js')
function getScript (key, script) {
  const scriptUrl = contextPath + key

  const hash = CryptoJs.SHA256(script).toString(CryptoJs.enc.Base64)
  return `
      <script crossorigin="anonymous" defer="defer"   type="application/javascript" 
      integrity="sha256-${hash}" 
      src="${scriptUrl}"></script>
      `
}

module.exports = {
  responseIntercept (context, interceptOpt, req, res, proxyReq, proxyRes, ssl, next) {
    const { rOptions, log, setting } = context
    let keys = interceptOpt.script
    if (typeof keys === 'string') {
      keys = [keys]
    }
    try {
      let tags = getScript('global', monkey.get(setting.script.dirAbsolutePath).global.script)
      for (const key of keys) {
        const script = monkey.get(setting.script.dirAbsolutePath)[key]
        if (script == null) {
          continue
        }
        const scriptTag = getScript(key, script.script)
        tags += '\r\n' + scriptTag
      }
      log.info('responseIntercept: insert script', rOptions.hostname, rOptions.path)
      return {
        head: tags
      }
    } catch (err) {
      log.error('load monkey script error', err)
    }
  },
  is (interceptOpt) {
    return interceptOpt.script
  }
}
