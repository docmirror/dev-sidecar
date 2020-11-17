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
    const { rOptions, log } = context
    let keys = interceptOpt.script
    if (typeof keys === 'string') {
      keys = [keys]
    }
    let tags = getScript('global', monkey.get().global.script)
    for (const key of keys) {
      const script = monkey.get()[key]
      if (script == null) {
        continue
      }
      const scriptTag = getScript(key, script.script)
      tags += '\r\n' + scriptTag
    }
    log.info('responseIntercept: append script', rOptions.hostname, rOptions.path)
    return {
      head: tags
    }
  },
  is (interceptOpt) {
    return interceptOpt.script
  }
}
