const contextPath = '/____ds_script____/'
const monkey = require('../../monkey')
module.exports = {
  requestIntercept (context, req, res, ssl, next) {
    const { rOptions, log } = context
    const urlPath = rOptions.path
    const filename = urlPath.replace(contextPath, '')

    const script = monkey.get()[filename]

    log.info('ds_script', filename, script != null)
    res.writeHead(200)
    res.write(script.script)
    res.end()
    return true
  },
  is (rOptions) {
    if (rOptions.path.indexOf(contextPath) !== 0) {
      return false
    }
    return true
  }
}
