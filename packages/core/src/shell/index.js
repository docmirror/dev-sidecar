const shell = require('./shell')
const killByPort = require('./scripts/kill-by-port')
const setupCa = require('./scripts/setup-ca')
const getSystemEnv = require('./scripts/get-system-env')
const setSystemEnv = require('./scripts/set-system-env')
const getNpmEnv = require('./scripts/get-npm-env')
const setNpmEnv = require('./scripts/set-npm-env')
const setSystemProxy = require('./scripts/set-system-proxy/index')
const enableLoopback = require('./scripts/enable-loopback')
const extraPath = require('./scripts/extra-path')
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
  getSystemPlatform: shell.getSystemPlatform
}
