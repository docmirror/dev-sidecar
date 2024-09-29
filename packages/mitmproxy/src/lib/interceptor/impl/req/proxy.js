const url = require('url')
const lodash = require('lodash')

// 替换占位符
function replacePlaceholder (url, rOptions, matched) {
  if (url.indexOf('${') >= 0) {
    // eslint-disable-next-line
    // no-template-curly-in-string
    // eslint-disable-next-line no-template-curly-in-string
    url = url.replace('${host}', rOptions.hostname)

    if (matched && url.indexOf('${') >= 0) {
      for (let i = 0; i < matched.length; i++) {
        url = url.replace('${m[' + i + ']}', matched[i] == null ? '' : matched[i])
      }
    }

    // 移除多余的占位符
    if (url.indexOf('${') >= 0) {
      url = url.replace(/\$\{[^}]+}/g, '')
    }
  }

  return url
}

function buildTargetUrl (rOptions, urlConf, interceptOpt, matched) {
  let targetUrl
  if (interceptOpt && interceptOpt.replace) {
    const regexp = new RegExp(interceptOpt.replace)
    targetUrl = rOptions.path.replace(regexp, urlConf)
  } else if (urlConf.indexOf('http:') === 0 || urlConf.indexOf('https:') === 0) {
    targetUrl = urlConf
  } else {
    let uri = rOptions.path
    if (uri.indexOf('http:') === 0 || uri.indexOf('https:') === 0) {
      // eslint-disable-next-line node/no-deprecated-api
      const URL = url.parse(uri)
      uri = URL.path
    }
    targetUrl = urlConf + uri
  }

  // 替换占位符
  targetUrl = replacePlaceholder(targetUrl, rOptions, matched)

  // 拼接协议
  targetUrl = targetUrl.indexOf('http:') === 0 || targetUrl.indexOf('https:') === 0 ? targetUrl : rOptions.protocol + '//' + targetUrl

  return targetUrl
}

function doProxy (proxyConf, rOptions, req, interceptOpt, matched) {
  // 获取代理目标地址
  const proxyTarget = buildTargetUrl(rOptions, proxyConf, interceptOpt, matched)

  // 替换rOptions的属性
  // eslint-disable-next-line node/no-deprecated-api
  const URL = url.parse(proxyTarget)
  rOptions.origional = lodash.cloneDeep(rOptions) // 备份原始请求参数
  delete rOptions.origional.agent
  delete rOptions.origional.headers
  rOptions.protocol = URL.protocol
  rOptions.hostname = URL.host
  rOptions.host = URL.host
  rOptions.headers.host = URL.host
  rOptions.path = URL.path
  if (URL.port == null) {
    rOptions.port = rOptions.protocol === 'https:' ? 443 : 80
  }

  return proxyTarget
}

module.exports = {
  name: 'proxy',
  priority: 121,
  replacePlaceholder,
  buildTargetUrl,
  doProxy,
  requestIntercept (context, interceptOpt, req, res, ssl, next, matched) {
    const { rOptions, log, RequestCounter } = context

    const originHostname = rOptions.hostname

    let proxyConf = interceptOpt.proxy
    if (RequestCounter && interceptOpt.backup && interceptOpt.backup.length > 0) {
      // 优选逻辑
      const backupList = [proxyConf]
      for (const bk of interceptOpt.backup) {
        backupList.push(bk)
      }
      const key = rOptions.hostname + '/' + interceptOpt.key
      const count = RequestCounter.getOrCreate(key, backupList)
      if (count.value == null) {
        count.doRank()
      }
      if (count.value == null) {
        log.error('`count.value` is null, the count:', count)
      } else {
        count.doCount(count.value)
        proxyConf = count.value
        context.requestCount = {
          key,
          value: count.value,
          count
        }
      }
    }

    // 替换 rOptions 中的地址，并返回代理目标地址
    const proxyTarget = doProxy(proxyConf, rOptions, req, interceptOpt, matched)

    if (context.requestCount) {
      log.info('proxy choice:', JSON.stringify(context.requestCount))
    }

    if (interceptOpt.sni != null) {
      let unVerifySsl = rOptions.agent.options.rejectUnauthorized === false

      rOptions.servername = interceptOpt.sni
      if (rOptions.agent.options.rejectUnauthorized && rOptions.agent.unVerifySslAgent) {
        // rOptions.agent.options.rejectUnauthorized = false // 不能直接在agent上进行修改属性值，因为它采用了单例模式，所有请求共用这个对象的
        rOptions.agent = rOptions.agent.unVerifySslAgent
        unVerifySsl = true
      }
      res.setHeader('DS-Interceptor', `proxy: ${proxyTarget}, sni: ${interceptOpt.sni}${unVerifySsl ? ', unVerifySsl' : ''}`)
      log.info('proxy intercept: hostname:', originHostname, ', target：', proxyTarget, ', sni replace servername:', rOptions.servername, (unVerifySsl ? ', unVerifySsl' : ''))
    } else {
      res.setHeader('DS-Interceptor', `proxy: ${proxyTarget}`)
      log.info('proxy intercept: hostname:', originHostname, ', target：', proxyTarget)
    }

    return true
  },
  is (interceptOpt) {
    return !!interceptOpt.proxy
  }
}
