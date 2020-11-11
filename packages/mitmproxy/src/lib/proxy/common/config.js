const path = require('path')

const config = exports

config.caCertFileName = 'dev-sidecar.ca.crt'

config.caKeyFileName = 'dev-sidecar.ca.key.pem'

config.defaultPort = 1181

config.caName = 'DevSidecar CA'

config.getDefaultCABasePath = function () {
  const userHome = process.env.HOME || process.env.USERPROFILE
  return path.resolve(userHome, './.dev-sidecar')
}

config.getDefaultCACertPath = function () {
  return path.resolve(config.getDefaultCABasePath(), config.caCertFileName)
}

config.getDefaultCAKeyPath = function () {
  return path.resolve(config.getDefaultCABasePath(), config.caKeyFileName)
}
