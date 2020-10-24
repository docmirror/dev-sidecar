const debug = require('debug')

module.exports = function getLogger (name) {
  return {
    debug: debug(`dev-sidecar:${name}:debug`),
    info: debug(`dev-sidecar:${name}:info`),
    error: debug(`dev-sidecar:${name}:error`)
  }
}

debug.enable('dev-sidecar:*')
