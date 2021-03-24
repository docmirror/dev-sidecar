const dnstls = require('dns-over-tls')
const BaseDNS = require('./base')
const axios = require('axios')
const log = require('../../utils/util.log')
const fs = require('fs')
const path = require('path')
module.exports = class DNSOverIpAddress extends BaseDNS {
  async _lookup (hostname) {
    const url = `https://${hostname}.ipaddress.com`

    // const res = fs.readFileSync(path.resolve(__dirname, './data.txt')).toString()
    const res = await axios.get(url)
    if (res.status !== 200 && res.status !== 201) {
      log.info(`[dns] get ${hostname} ipaddress: error:${res}`)
      return
    }
    const ret = res.data

    const regexp = /<tr><th>IP Address<\/th><td><ul class="comma-separated"><li>([^<]*)<\/li><\/ul><\/td><\/tr>/gm
    const matched = regexp.exec(ret)
    let ip = null

    if (matched && matched.length >= 1) {
      ip = matched[1]
      log.info(`[dns] get ${hostname} ipaddress:${ip}`)
      return [ip]
    }
    log.info(`[dns] get ${hostname} ipaddress: error`)
    return null

    // const { answers } = await dnstls.query(hostname)
    //
    // const answer = answers.find(answer => answer.type === 'A' && answer.class === 'IN')
    //
    // log.info('dns lookup：', hostname, answer)
    // if (answer) {
    //   return answer.data
    // }
  }
}
