const tlsUtils = require('./tlsUtils')
// const https = require('https')
const log = require('../../../utils/util.log.server')

module.exports = class CertAndKeyContainer {
  constructor ({
    maxLength = 1000,
    caCert,
    caKey,
  }) {
    this.cacheMap = new Map()
    this.maxLength = maxLength
    this.caCert = caCert
    this.caKey = caKey
  }

  _addCertPromise (certPromiseObj) {
    if (this.cacheMap.size >= this.maxLength) {
      // 淘汰最久未使用的条目（Map 中的第一个条目）
      const { value: [evictKey] } = this.cacheMap.entries().next()
      this.cacheMap.delete(evictKey)
      log.info(`超过最大证书数量${this.maxLength}，删除旧证书，dnsName: ${evictKey}`)
    }
    this.cacheMap.set(certPromiseObj.dnsName, certPromiseObj)
    return certPromiseObj
  }

  getCertPromise (hostname, port, dnsName, mappingHostNames) {
    // O(1) LRU Map 快速查找，避免每次创建 fakeServer 时线性扫描队列
    const cached = this.cacheMap.get(dnsName)
    if (cached) {
      // LRU 更新：删除后重新插入，移到 Map 末尾（最近使用）
      this.cacheMap.delete(dnsName)
      this.cacheMap.set(dnsName, cached)
      log.info(`Load fakeCertPromise from cache, hostname: ${hostname}:${port}, certPromiseObj: {"mappingHostNames":${JSON.stringify(cached.mappingHostNames)}}`)
      return cached.promise
    }

    log.info(`【CreateFakeCertificate】dnsName: ${dnsName}, hostname: ${hostname}:${port}`)
    const promise = tlsUtils.createFakeCertificateByDomain(this.caKey, this.caCert, dnsName, mappingHostNames)

    this._addCertPromise({
      dnsName,
      mappingHostNames,
      promise,
    })

    return promise
  }
}
