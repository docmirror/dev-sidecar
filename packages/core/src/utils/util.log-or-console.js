let log = console

function _doLog (fun, args) {
  if (log === console) {
    log[fun](...[`[${fun.toUpperCase()}]`, ...args])
  } else {
    log[fun](...args)
  }
}

module.exports = {
  setLogger (logger) {
    log = logger
  },

  debug () {
    // eslint-disable-next-line prefer-rest-params
    _doLog('debug', arguments)
  },
  info () {
    // eslint-disable-next-line prefer-rest-params
    _doLog('info', arguments)
  },
  warn () {
    // eslint-disable-next-line prefer-rest-params
    _doLog('warn', arguments)
  },
  error () {
    // eslint-disable-next-line prefer-rest-params
    _doLog('error', arguments)
  },
}
