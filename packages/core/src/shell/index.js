const shell = require('./shell')
const killByPort = require('./scripts/kill-by-port')
const setupCa = require('./scripts/setup-ca')
const getSystemEnv = require('./scripts/get-system-env')
const setSystemEnv = require('./scripts/set-system-env')
const getNpmEnv = require('./scripts/get-npm-env')
const setNpmEnv = require('./scripts/set-npm-env')
module.exports = {
  killByPort,
  setupCa,
  getSystemEnv,
  setSystemEnv,
  getNpmEnv,
  setNpmEnv,
  exec (cmds, args) {
    shell.getSystemShell().exec(cmds, args)
  }
}
