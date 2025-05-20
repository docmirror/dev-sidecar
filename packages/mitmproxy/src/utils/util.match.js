const lodash = require('lodash')
const log = require('./util.log.server')

function isMatched (url, regexp) {
  if (regexp === '.*' || regexp === '*' || regexp === 'true' || regexp === true) {
    return [url]
  }

  try {
    let urlRegexp = regexp
    if (regexp[0] === '*' || regexp[0] === '?' || regexp[0] === '+') {
      urlRegexp = `.${regexp}`
    }
    return url.match(urlRegexp)
  } catch {
    log.error('匹配串有问题:', regexp)
    return null
  }
}

function domainRegexply (target) {
  if (target === '.*' || target === '*' || target === 'true' || target === true) {
    return '^.*$'
  }
  return `^${target.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`
}

function domainMapRegexply (hostMap) {
  if (hostMap == null) {
    return { origin: {} }
  }
  const regexpMap = {}
  const origin = {} // 用于快速匹配，见matchHostname、matchHostnameAll方法
  lodash.each(hostMap, (value, domain) => {
    try {
      // 将域名匹配串格式如 `.xxx.com` 转换为 `*.xxx.com`
      if (domain[0] === '.') {
        if (hostMap[`*${domain}`] != null) {
          return // 如果已经有匹配串 `*.xxx.com`，则忽略 `.xxx.com`
        }
        domain = `*${domain}`
      }

      if (domain.includes('*') || domain[0] === '^') {
        const regDomain = domain[0] !== '^' ? domainRegexply(domain) : domain
        regexpMap[regDomain] = value

        if (domain.indexOf('*') === 0 && domain.lastIndexOf('*') === 0) {
          origin[domain] = value
        }
      } else {
        origin[domain] = value
      }
    } catch (e) {
      log.error('匹配串有问题:', domain, e)
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

  // 域名快速匹配：直接匹配（优先级最高）
  let value = hostMap.origin[hostname]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "${hostname}": ${JSON.stringify(value)} }`)
    return value // 快速匹配成功
  }
  // 域名快速匹配：三种前缀通配符匹配
  value = hostMap.origin[`*.${hostname}`]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "*.${hostname}": ${JSON.stringify(value)} }`)
    return value // 快速匹配成功
  }
  value = hostMap.origin[`*${hostname}`]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "*${hostname}": ${JSON.stringify(value)} }`)
    return value // 快速匹配成功
  }

  // 通配符匹配 或 正则表达式匹配
  for (const regexp in hostMap) {
    if (regexp === 'origin') {
      continue
    }

    // 正则表达式匹配
    if (hostname.match(regexp)) {
      value = hostMap[regexp]
      log.info(`matchHostname: ${action}: '${hostname}' -> { "${regexp}": ${JSON.stringify(value)} }`)
      return value
    }
  }

  log.debug(`matchHostname: ${action}: '${hostname}' Not-Matched`)
}

function merge (oldObj, newObj) {
  return lodash.mergeWith(oldObj, newObj, (objValue, srcValue) => {
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
  for (const regexp in hostMap) {
    if (regexp === 'origin') {
      continue
    }

    // if (target.indexOf('*') < 0 && target[0] !== '^') {
    //   continue // 不是通配符匹配串，也不是正则表达式，跳过
    // }

    // 正则表达式匹配
    const matched = hostname.match(regexp)
    if (matched) {
      value = hostMap[regexp]
      log.debug(`matchHostname-one: ${action}: '${hostname}' -> { "${regexp}": ${JSON.stringify(value)} }`)
      values = merge(values, value)

      // 设置matched
      if (matched.length > 1) {
        if (values.matched) {
          // 合并array
          matched.shift()
          values.matched = [...values.matched, ...matched] // 拼接上多个matched

          // 合并groups
          if (matched.groups) {
            values.matched.groups = merge(values.matched.groups, matched.groups)
          } else {
            values.matched.groups = matched.groups
          }
        } else {
          values.matched = matched
        }
      }
    }
  }

  // 域名快速匹配：直接匹配 或者 两种前缀通配符匹配
  // 优先级：2
  value = hostMap.origin[`*${hostname}`]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> { "*${hostname}": ${JSON.stringify(value)} }`)
    values = merge(values, value)
  }
  // 优先级：3
  value = hostMap.origin[`*.${hostname}`]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> { "*.${hostname}": ${JSON.stringify(value)} }`)
    values = merge(values, value)
  }
  // 优先级：4，最高（注：优先级高的配置，可以覆盖优先级低的配置，甚至有空配置时，可以移除已有配置）
  value = hostMap.origin[hostname]
  if (value) {
    log.debug(`matchHostname-one: ${action}: '${hostname}' -> { "${hostname}": ${JSON.stringify(value)} }`)
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
  matchHostnameAll,
}
