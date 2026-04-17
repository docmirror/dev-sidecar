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
    this.maxLength = maxLength
    // this.getCertSocketTimeout = getCertSocketTimeout
    this.caCert = caCert
    this.caKey = caKey
    // LRU Map: JS Map 按插入顺序迭代，用 delete+reinsert 实现 O(1) LRU 更新；键：dnsName
    this._lruMap = new Map()
  }

  addCertPromise (certPromiseObj) {
    if (this._lruMap.size >= this.maxLength) {
      // 淘汰最久未使用的条目（Map 中的第一个条目）
      const iter = this._lruMap.entries()
      const { value: [evictKey] } = iter.next()
      this._lruMap.delete(evictKey)
      log.info(`超过最大证书数量${this.maxLength}，删除旧证书，dnsName: ${evictKey}`)
    }
    this._lruMap.set(certPromiseObj._mapKey, certPromiseObj)
    return certPromiseObj
  }

  getCertPromise (hostname, port, dnsName, mappingHostNames) {
    // O(1) LRU Map 快速查找，避免每次创建 fakeServer 时线性扫描队列
    const cached = this._lruMap.get(dnsName)
    if (cached) {
      // LRU 更新：删除后重新插入，移到 Map 末尾（最近使用）
      this._lruMap.delete(dnsName)
      this._lruMap.set(dnsName, cached)
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
}
