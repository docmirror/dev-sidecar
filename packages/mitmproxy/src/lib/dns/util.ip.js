const net = require('node:net')

module.exports = {

  // Adblock 等规则常用 0.0.0.0（A 记录）或 ::（AAAA 记录）表示拦截，这类地址不应参与测速/统计
  isZeroIp (ip) {
    if (!ip || typeof ip !== 'string') {
      return false
    }
    const value = ip.trim().replace(/^\[|\]$/g, '')
    if (value === '0.0.0.0') {
      return true
    }
    if (net.isIP(value) !== 6) {
      return false
    }
    const parts = value.split('::')
    if (parts.length > 2) {
      return false
    }
    const left = parts[0] ? parts[0].split(':') : []
    const right = parts[1] ? parts[1].split(':') : []
    const missing = 8 - left.length - right.length
    if (missing < 0) {
      return false
    }
    const groups = [...left, ...Array(missing).fill('0'), ...right]
    return groups.every(group => /^0{0,4}$/.test(group))
  },

  isIPv6 (str) {
    // 如果含[]，则肯定是IPv6
    if (str.includes('[')) {
      return true
    }

    // 标准宽松 IPv6 正则
    const ipv6Pattern = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?\d)?\d)\.){3}(?:25[0-5]|(?:2[0-4]|1?\d)?\d)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?\d)?\d)\.){3}(?:25[0-5]|(?:2[0-4]|1?\d)?\d))$/
    return ipv6Pattern.test(str.trim())
  },

}
