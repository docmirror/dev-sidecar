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
    // 用于 O(1) 快速查找已有证书，避免每次创建 fakeServer 时线性扫描 queue
    // 键：dnsName
    this._certMap = new Map()
  }

  addCertPromise (certPromiseObj) {
    if (this.queue.length >= this.maxLength) {
      const delCertObj = this.queue.shift()
      log.info(`超过最大证书数量${this.maxLength}，删除旧证书。delCertObj:`, delCertObj)
      // 同步从 map 中删除
      if (delCertObj._mapKey) {
        this._certMap.delete(delCertObj._mapKey)
      }
    }
    this.queue.push(certPromiseObj)
    if (certPromiseObj._mapKey) {
      this._certMap.set(certPromiseObj._mapKey, certPromiseObj)
    }
    return certPromiseObj
  }

  getCertPromise (hostname, port, dnsName, mappingHostNames) {
    // O(1) map 快速查找，避免每次创建 fakeServer 时线性扫描 queue
    const cached = this._certMap.get(dnsName)
    if (cached) {
      log.info(`Load fakeCertPromise from cache, hostname: ${hostname}:${port}, certPromiseObj: {"mappingHostNames":${JSON.stringify(cached.mappingHostNames)}}`)
      return cached.promise
    }

    const certPromiseObj = {
      mappingHostNames,
      _mapKey: dnsName,
    }

    log.info(`【CreateFakeCertificate】dnsName: ${dnsName}, hostname: ${hostname}:${port}`)
    const promise = tlsUtils.createFakeCertificateByDomain(this.caKey, this.caCert, dnsName, mappingHostNames)

    certPromiseObj.promise = promise
    this.addCertPromise(certPromiseObj)

    return promise
  }

  reRankCert (index) {
    // index ==> queue foot
    this.queue.push((this.queue.splice(index, 1))[0])
  }
}
