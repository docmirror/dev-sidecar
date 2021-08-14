const lodash = require('lodash')
function isMatched (url, regexp) {
  return url.match(regexp)
}

function domainRegexply (target) {
  return target.replace(/\./g, '\\.').replace(/\*/g, '.*')
}

function domainMapRegexply (hostMap) {
  const regexpMap = {}
  if (hostMap == null) {
    return regexpMap
  }
  lodash.each(hostMap, (value, domain) => {
    if (domain.indexOf('*') >= 0) {
      const regDomain = domainRegexply(domain)
      regexpMap[regDomain] = value
    } else {
      regexpMap[domain] = value
    }
  })
  return regexpMap
}

function matchHostname (hostMap, hostname) {
  if (hostMap == null) {
    return null
  }
  const value = hostMap[hostname]
  if (value) {
    return value
  }
  if (!value) {
    for (const target in hostMap) {
      if (target.indexOf('*') < 0) {
        continue
      }
      // 正则表达式匹配
      if (hostname.match(target)) {
        return hostMap[target]
      }
    }
  }
}
module.exports = {
  isMatched,
  domainRegexply,
  domainMapRegexply,
  matchHostname
}
