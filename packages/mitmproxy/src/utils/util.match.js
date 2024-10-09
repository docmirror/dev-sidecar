const lodash = require('lodash')
const log = require('./util.log')

function isMatched (url, regexp) {
  if (regexp === '.*' || regexp === '*' || regexp === 'true' || regexp === true) {
    return [url]
  }

  try {
    let urlRegexp = regexp
    if (regexp[0] === '*' || regexp[0] === '?' || regexp[0] === '+') {
      urlRegexp = '.' + regexp
    }
    return url.match(urlRegexp)
  } catch (e) {
    log.error('匹配串有问题:', regexp)
    return null
  }
}

function domainRegexply (target) {
  if (target === '.*' || target === '*' || target === 'true' || target === true) {
    return '^.*$'
  }
  return '^' + target.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
}

function domainMapRegexply (hostMap) {
  const regexpMap = {}
  const origin = {} // 用于快速匹配，见matchHostname、matchHostnameAll方法
  if (hostMap == null) {
    return regexpMap
  }
  lodash.each(hostMap, (value, domain) => {
    if (domain.indexOf('*') >= 0 || domain[0] === '^') {
      const regDomain = domain[0] !== '^' ? domainRegexply(domain) : domain
      regexpMap[regDomain] = value

      if (domain.indexOf('*') === 0 && domain.lastIndexOf('*') === 0) {
        origin[domain] = value
      }
    } else {
      origin[domain] = value
    }
  })
  regexpMap.origin = origin
  return regexpMap
}

function matchHostname (hostMap, hostname, action) {
  // log.error('matchHostname:', action, hostMap)

  if (hostMap == null) {
    log.warn(`matchHostname: ${action}: '${hostname}' Not-Matched, hostMap is null`)
    return null
  }
  if (hostMap.origin == null) {
    log.warn(`matchHostname: ${action}: '${hostname}' Not-Matched, hostMap.origin is null`)
    return null
  }

  // 域名快速匹配：直接匹配 或者 两种前缀通配符匹配
  let value = hostMap.origin[hostname]
  if (value) {
    log.info(`matchHostname: ${action}: '${hostname}' -> '${hostname}': ${JSON.stringify(value)}`)
    return value // 快速匹配成功
  }
  value = hostMap.origin['*' + hostname]
  if (value) {
    log.info(`matchHostname: ${action}: '${hostname}' -> '*${hostname}': ${JSON.stringify(value)}`)
    return value // 快速匹配成功
  }
  value = hostMap.origin['*.' + hostname]
  if (value) {
    log.info(`matchHostname: ${action}: '${hostname}' -> '*.${hostname}': ${JSON.stringify(value)}`)
    return value // 快速匹配成功
  }

  // 通配符匹配 或 正则表达式匹配
  for (const target in hostMap) {
    if (target === 'origin') {
      continue
    }

    // if (target.indexOf('*') < 0 && target[0] !== '^') {
    //   continue // 不是通配符匹配串，也不是正则表达式，跳过
    // }

    // 如果是通配符匹配串，转换为正则表达式
    let regexp = target
    // if (target[0] !== '^') {
    //   regexp = domainRegexply(regexp)
    // }

    // 正则表达式匹配
    if (hostname.match(regexp)) {
      value = hostMap[target]
      log.info(`matchHostname: ${action}: '${hostname}' -> '${target}': ${JSON.stringify(value)}`)
      return value
    }
  }

  log.debug(`matchHostname: ${action}: '${hostname}' Not-Matched`)
}

function merge (oldObj, newObj) {
  return lodash.mergeWith(oldObj, newObj, function (objValue, srcValue) {
    if (lodash.isArray(objValue)) {
      return srcValue
    }
  })
}
function deleteNullItems (target) {
  lodash.forEach(target, (item, key) => {
    if (item == null || item === '[delete]') {
      delete target[key]
    }
    if (lodash.isObject(item)) {
      deleteNullItems(item)
    }
  })
}

function matchHostnameAll (hostMap, hostname, action) {
  // log.debug('matchHostname-all:', action, hostMap)

  if (hostMap == null) {
    log.warn(`matchHostname-all: ${action}: '${hostname}', hostMap is null`)
    return null
  }
  if (hostMap.origin == null) {
    log.warn(`matchHostname-all: ${action}: '${hostname}', hostMap.origin is null`)
    return null
  }

  let values = {}
  let value

  // 通配符匹配 或 正则表达式匹配（优先级：1，最低）
  for (const target in hostMap) {
    if (target === 'origin') {
      continue
    }

    // if (target.indexOf('*') < 0 && target[0] !== '^') {
    //   continue // 不是通配符匹配串，也不是正则表达式，跳过
    // }

    // 如果是通配符匹配串，转换为正则表达式
    let regexp = target
    // if (target[0] !== '^') {
    //   regexp = domainRegexply(regexp)
    // }

    // 正则表达式匹配
    if (hostname.match(regexp)) {
      value = hostMap[target]
      log.debug(`matchHostname-one: ${action}: '${hostname}' -> '${target}': ${JSON.stringify(value)}`)
      values = merge(values, value)
    }
  }

  // 域名快速匹配：直接匹配 或者 两种前缀通配符匹配
  // 优先级：2
  value = hostMap.origin['*' + hostname]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> '*${hostname}': ${JSON.stringify(value)}`)
    values = merge(values, value)
  }
  // 优先级：3
  value = hostMap.origin['*.' + hostname]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> '*.${hostname}': ${JSON.stringify(value)}`)
    values = merge(values, value)
  }
  // 优先级：4，最高（注：优先级高的配置，可以覆盖优先级低的配置，甚至有空配置时，可以移除已有配置）
  value = hostMap.origin[hostname]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> '${hostname}': ${JSON.stringify(value)}`)
    values = merge(values, value)
  }

  if (!lodash.isEmpty(values)) {
    deleteNullItems(values)
    log.info(`matchHostname-all: ${action}: '${hostname}':`, JSON.stringify(values))
    return values
  } else {
    log.debug(`matchHostname-all: ${action}: '${hostname}' Not-Matched`)
  }
}

module.exports = {
  isMatched,
  domainRegexply,
  domainMapRegexply,
  matchHostname,
  matchHostnameAll
}
