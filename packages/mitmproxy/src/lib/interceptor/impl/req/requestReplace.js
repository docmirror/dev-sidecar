const REMOVE = '[remove]'

function replaceRequestHeaders (rOptions, headers, log) {
  for (const key in headers) {
    let value = headers[key]
    if (value === REMOVE) {
      value = null
    }

    if (value) {
      log.debug(`[DS-RequestReplace-Interceptor] replace '${key}': '${rOptions.headers[key.toLowerCase()]}' -> '${value}'`)
      rOptions.headers[key.toLowerCase()] = value
    } else if (rOptions.headers[key.toLowerCase()]) {
      log.debug(`[DS-RequestReplace-Interceptor] remove '${key}': '${rOptions.headers[key.toLowerCase()]}'`)
      delete rOptions.headers[key.toLowerCase()]
    }
  }

  log.debug(`[DS-RequestReplace-Interceptor] 最终headers: \r\n${JSON.stringify(rOptions.headers, null, '\t')}`)
}

module.exports = {
  name: 'requestReplace',
  priority: 111,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    const requestReplaceConfig = interceptOpt.requestReplace

    let actions = ''

    // 替换请求头
    if (requestReplaceConfig.headers) {
      replaceRequestHeaders(rOptions, requestReplaceConfig.headers, log)
      actions += 'headers'
    }

    // 替换下载文件请求的请求地址（此功能主要是为了方便拦截配置）
    if (requestReplaceConfig.doDownload && rOptions.path.indexOf('?DS_DOWNLOAD') >= 0) {
      rOptions.doDownload = true
      rOptions.path = rOptions.path.replace('?DS_DOWNLOAD', '')
      actions += (actions ? ',' : '') + 'path:remove-DS_DOWNLOAD'
    }

    res.setHeader('DS-RequestReplace-Interceptor', actions)
  },
  is (interceptOpt) {
    return !!interceptOpt.requestReplace
  }
}
