const path = require('node:path')

const config = exports

config.defaultHost = '127.0.0.1'
config.defaultPort = 31181
config.defaultMaxLength = 100

config.caCertFileName = 'dev-sidecar.ca.crt'
config.caKeyFileName = 'dev-sidecar.ca.key.pem'
config.caName = 'DevSidecar - This certificate is generated locally'
config.caBasePath = buildDefaultCABasePath()

config.getDefaultCABasePath = function () {
  return config.caBasePath
}
config.setDefaultCABasePath = function (path) {
  config.caBasePath = path
}
function buildDefaultCABasePath () {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  return path.resolve(userHome, './.dev-sidecar')
}

config.getDefaultCACertPath = function () {
  return path.resolve(config.getDefaultCABasePath(), config.caCertFileName)
}

config.getDefaultCAKeyPath = function () {
  return path.resolve(config.getDefaultCABasePath(), config.caKeyFileName)
}
