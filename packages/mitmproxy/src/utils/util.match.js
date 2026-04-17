const lodash = require('lodash')
const log = require('./util.log.server')
const mergeApi = require('@docmirror/dev-sidecar/src/merge')

// Pre-compiled path RegExp cache, keyed by the raw regexp string.
// Avoids re-creating RegExp objects on every call to isMatched().
const pathRegexpCache = new Map()

function isMatched (url, regexp) {
  if (regexp === '.*' || regexp === '*' || regexp === 'true' || regexp === true) {
    return [url]
  }

  try {
    let compiled = pathRegexpCache.get(regexp)
    if (!compiled) {
      let urlRegexp = regexp
      if (regexp[0] === '*' || regexp[0] === '?' || regexp[0] === '+') {
        urlRegexp = `.${regexp}`
      }
      compiled = new RegExp(urlRegexp)
      pathRegexpCache.set(regexp, compiled)
    }
    return compiled.exec(url)
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
  const compiledRegexps = [] // 预编译的正则表达式列表，用于避免每次请求重复创建 RegExp 对象
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
        compiledRegexps.push({ regexp: new RegExp(regDomain), key: regDomain, value }) // 预编译正则

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
  // 以不可枚举属性存储，避免 for...in 遍历时被当作域名模式处理
  Object.defineProperty(regexpMap, '_compiledRegexps', { value: compiledRegexps, enumerable: false, configurable: true })
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

  // 命中缓存时直接返回，避免每次请求重复做正则匹配
  if (!hostMap._cache) {
    Object.defineProperty(hostMap, '_cache', { value: new Map(), enumerable: false, configurable: true })
  }
  if (hostMap._cache.has(hostname)) {
    return hostMap._cache.get(hostname)
  }

  let value

  // 域名快速匹配：直接匹配（优先级最高）
  value = hostMap.origin[hostname]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "${hostname}": ${JSON.stringify(value)} }`)
    hostMap._cache.set(hostname, value)
    return value // 快速匹配成功
  }
  // 域名快速匹配：三种前缀通配符匹配
  value = hostMap.origin[`*.${hostname}`]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "*.${hostname}": ${JSON.stringify(value)} }`)
    hostMap._cache.set(hostname, value)
    return value // 快速匹配成功
  }
  value = hostMap.origin[`*${hostname}`]
  if (value != null) {
    log.info(`matchHostname: ${action}: '${hostname}' -> { "*${hostname}": ${JSON.stringify(value)} }`)
    hostMap._cache.set(hostname, value)
    return value // 快速匹配成功
  }

  // 通配符匹配 或 正则表达式匹配：优先使用预编译的正则表达式，避免重复创建 RegExp 对象
  const compiledRegexps = hostMap._compiledRegexps
  if (compiledRegexps) {
    for (const { regexp, key, value: val } of compiledRegexps) {
      if (regexp.test(hostname)) {
        log.info(`matchHostname: ${action}: '${hostname}' -> { "${key}": ${JSON.stringify(val)} }`)
        hostMap._cache.set(hostname, val)
        return val
      }
    }
  } else {
    for (const regexp in hostMap) {
      if (regexp === 'origin') {
        continue
      }

      // 正则表达式匹配
      if (hostname.match(regexp)) {
        value = hostMap[regexp]
        log.info(`matchHostname: ${action}: '${hostname}' -> { "${regexp}": ${JSON.stringify(value)} }`)
        hostMap._cache.set(hostname, value)
        return value
      }
    }
  }

  hostMap._cache.set(hostname, undefined)
  log.debug(`matchHostname: ${action}: '${hostname}' Not-Matched`)
}

function merge (oldObj, newObj) {
  return lodash.mergeWith(oldObj, newObj, (objValue, srcValue) => {
    if (lodash.isArray(objValue)) {
      return srcValue
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

  // 命中缓存时直接返回，避免每次请求重复做正则匹配和 lodash.merge
  if (!hostMap._cacheAll) {
    Object.defineProperty(hostMap, '_cacheAll', { value: new Map(), enumerable: false, configurable: true })
  }
  if (hostMap._cacheAll.has(hostname)) {
    return hostMap._cacheAll.get(hostname)
  }

  let values = {}
  let value

  // 通配符匹配 或 正则表达式匹配（优先级：1，最低）：优先使用预编译的正则表达式，避免重复创建 RegExp 对象
  const compiledRegexps = hostMap._compiledRegexps
  if (compiledRegexps) {
    for (const { regexp, key, value: val } of compiledRegexps) {
      const matched = regexp.exec(hostname)
      if (matched) {
        log.debug(`matchHostname-one: ${action}: '${hostname}' -> { "${key}": ${JSON.stringify(val)} }`)
        values = merge(values, val)

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
  } else {
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
    mergeApi.deleteNullItems(values)
    log.info(`matchHostname-all: ${action}: '${hostname}':`, JSON.stringify(values))
    hostMap._cacheAll.set(hostname, values)
    return values
  } else {
    log.debug(`matchHostname-all: ${action}: '${hostname}' Not-Matched`)
    hostMap._cacheAll.set(hostname, undefined)
  }
}

module.exports = {
  isMatched,
  domainRegexply,
  domainMapRegexply,
  matchHostname,
  matchHostnameAll,
}
