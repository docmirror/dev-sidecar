const fs = require('node:fs')
const forge = require('node-forge')
const log = require('../../../utils/util.log')
const FakeServersCenter = require('../tls/FakeServersCenter')

module.exports = function createFakeServerCenter ({
  maxLength,
  caCertPath,
  caKeyPath,
  requestHandler,
  upgradeHandler,
  getCertSocketTimeout,
}) {
  let caCert
  let caKey
  try {
    fs.accessSync(caCertPath, fs.F_OK)
    fs.accessSync(caKeyPath, fs.F_OK)
    const caCertPem = fs.readFileSync(caCertPath)
    const caKeyPem = fs.readFileSync(caKeyPath)
    caCert = forge.pki.certificateFromPem(caCertPem)
    caKey = forge.pki.privateKeyFromPem(caKeyPem)
  } catch (e) {
    log.error('Can not find `CA certificate` or `CA key`:', e)
    process.exit(1)
  }

  return new FakeServersCenter({
    caCert,
    caKey,
    maxLength,
    requestHandler,
    upgradeHandler,
    getCertSocketTimeout,
  })
}
