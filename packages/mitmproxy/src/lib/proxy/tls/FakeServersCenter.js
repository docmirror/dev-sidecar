const https = require('https')
const tlsUtils = require('./tlsUtils')
const CertAndKeyContainer = require('./CertAndKeyContainer')
const forge = require('node-forge')
const pki = forge.pki
// const colors = require('colors')
const tls = require('tls')
const log = require('../../../utils/util.log')
module.exports = class FakeServersCenter {
  constructor ({ maxLength = 256, requestHandler, upgradeHandler, caCert, caKey, getCertSocketTimeout }) {
    this.queue = []
    this.maxLength = maxLength
    this.requestHandler = requestHandler
    this.upgradeHandler = upgradeHandler
    this.certAndKeyContainer = new CertAndKeyContainer({
      getCertSocketTimeout,
      caCert,
      caKey
    })
  }

  addServerPromise (serverPromiseObj) {
    if (this.queue.length >= this.maxLength) {
      const delServerObj = this.queue.shift()
      try {
        log.info('超过最大服务数量，删除旧服务', delServerObj)
        delServerObj.serverObj.server.close()
      } catch (e) {
        log.info(e)
      }
    }
    this.queue.push(serverPromiseObj)
    return serverPromiseObj
  }

  getServerPromise (hostname, port) {
    for (let i = 0; i < this.queue.length; i++) {
      const serverPromiseObj = this.queue[i]
      const mappingHostNames = serverPromiseObj.mappingHostNames
      for (let j = 0; j < mappingHostNames.length; j++) {
        const DNSName = mappingHostNames[j]
        if (tlsUtils.isMappingHostName(DNSName, hostname)) {
          this.reRankServer(i)
          return serverPromiseObj.promise
        }
      }
    }

    const serverPromiseObj = {
      mappingHostNames: [hostname] // temporary hostname
    }

    const promise = new Promise((resolve, reject) => {
      (async () => {
        const certObj = await this.certAndKeyContainer.getCertPromise(hostname, port)
        const cert = certObj.cert
        const key = certObj.key
        const certPem = pki.certificateToPem(cert)
        const keyPem = pki.privateKeyToPem(key)
        const fakeServer = new https.Server({
          key: keyPem,
          cert: certPem,
          SNICallback: (hostname, done) => {
            (async () => {
              const certObj = await this.certAndKeyContainer.getCertPromise(hostname, port)
              log.info('sni callback:', hostname)
              done(null, tls.createSecureContext({
                key: pki.privateKeyToPem(certObj.key),
                cert: pki.certificateToPem(certObj.cert)
              }))
            })()
          }
        })
        const serverObj = {
          cert,
          key,
          server: fakeServer,
          port: 0 // if prot === 0 ,should listen server's `listening` event.
        }
        serverPromiseObj.serverObj = serverObj
        fakeServer.listen(0, () => {
          const address = fakeServer.address()
          serverObj.port = address.port
        })
        fakeServer.on('request', (req, res) => {
          const ssl = true
          this.requestHandler(req, res, ssl)
        })
        fakeServer.on('error', (e) => {
          log.error(e)
        })
        fakeServer.on('listening', () => {
          const mappingHostNames = tlsUtils.getMappingHostNamesFormCert(certObj.cert)
          serverPromiseObj.mappingHostNames = mappingHostNames
          resolve(serverObj)
        })
        fakeServer.on('upgrade', (req, socket, head) => {
          const ssl = true
          this.upgradeHandler(req, socket, head, ssl)
        })
      })()
    })

    serverPromiseObj.promise = promise

    return (this.addServerPromise(serverPromiseObj)).promise
  }

  reRankServer (index) {
    // index ==> queue foot
    this.queue.push((this.queue.splice(index, 1))[0])
  }
}
