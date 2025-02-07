const enableLoopback = require('./scripts/enable-loopback')
const extraPath = require('./scripts/extra-path')
const getNpmEnv = require('./scripts/get-npm-env')
const getSystemEnv = require('./scripts/get-system-env')
const killByPort = require('./scripts/kill-by-port')
const setNpmEnv = require('./scripts/set-npm-env')
const setSystemEnv = require('./scripts/set-system-env')
const setSystemProxy = require('./scripts/set-system-proxy')
const setupCa = require('./scripts/setup-ca')
const shell = require('./shell')

module.exports = {
  killByPort,
  setupCa,
  getSystemEnv,
  setSystemEnv,
  getNpmEnv,
  setNpmEnv,
  setSystemProxy,
  enableLoopback,
  extraPath,
  async exec (cmds, args) {
    return shell.getSystemShell().exec(cmds, args)
  },
  getSystemPlatform: shell.getSystemPlatform,
}
