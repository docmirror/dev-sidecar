const tlsUtils = require('./tlsUtils')
// const https = require('https')
const log = require('../../../utils/util.log.server')

module.exports = class CertAndKeyContainer {
  constructor ({
    maxLength = 1000,
    // getCertSocketTimeout = 2 * 1000,
    caCert,
    caKey,
  }) {
    this.queue = []
    this.maxLength = maxLength
    // this.getCertSocketTimeout = getCertSocketTimeout
    this.caCert = caCert
    this.caKey = caKey
  }

  addCertPromise (certPromiseObj) {
    if (this.queue.length >= this.maxLength) {
      const delCertObj = this.queue.shift()
      log.info(`超过最大证书数量${this.maxLength}，删除旧证书。delCertObj:`, delCertObj)
    }
    this.queue.push(certPromiseObj)
    return certPromiseObj
  }

  getCertPromise (hostname, port, dnsName, mappingHostNames) {
    for (let i = 0; i < this.queue.length; i++) {
      const _certPromiseObj = this.queue[i]
      const mappingHostNames = _certPromiseObj.mappingHostNames
      for (let j = 0; j < mappingHostNames.length; j++) {
        const DNSName = mappingHostNames[j]
        if (DNSName === dnsName || tlsUtils.isMappingHostName(DNSName, hostname)) {
          this.reRankCert(i)
          log.info(`Load fakeCertPromise from cache, hostname: ${hostname}:${port}, certPromiseObj: {"mappingHostNames":${JSON.stringify(_certPromiseObj.mappingHostNames)}}`)
          return _certPromiseObj.promise
        }
      }
    }

    const certPromiseObj = {
      mappingHostNames,
    }

    const promise = new Promise((resolve, _reject) => {
      log.info(`【CreateFakeCertificate】dnsName: ${dnsName}, hostname: ${hostname}:${port}`)

      const certObj = tlsUtils.createFakeCertificateByDomain(this.caKey, this.caCert, dnsName, mappingHostNames)
      resolve(certObj)
    })

    certPromiseObj.promise = promise
    this.addCertPromise(certPromiseObj)

    return promise
  }

  reRankCert (index) {
    // index ==> queue foot
    this.queue.push((this.queue.splice(index, 1))[0])
  }
}
