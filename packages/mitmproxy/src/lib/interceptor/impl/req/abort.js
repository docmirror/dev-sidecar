module.exports = {
  name: 'abort',
  priority: 103,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    if (interceptOpt.abort === true || interceptOpt.abort === 'true') {
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'DS-Interceptor': 'abort',
      }

      // headers.Access-Control-Allow-*：避免跨域问题
      if (rOptions.headers.origin) {
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Access-Control-Allow-Origin'] = rOptions.headers.origin
      }

      res.writeHead(403, headers)
      res.write(
        'DevSidecar 403: Request abort.\n\n'
        + '  This request is matched by abort intercept.\n\n'
        + '  因配置abort拦截器，本请求直接返回403禁止访问。',
      )
      res.end()

      const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
      log.info('abort intercept:', url)
      return true // true代表请求结束
    } else {
      const response = interceptOpt.abort

      // status
      const status = response.status || 403
      response.status = status

      // body
      const body = response.html || response.json || response.script || response.css || response.text || response.body
        || `DevSidecar ${status}: Request abort.\n\n`
        + '  This request is matched by abort intercept.\n\n'
        + `  因配置abort拦截器，本请求直接返回${status}禁止访问。`

      // headers
      const headers = response.headers || {}
      response.headers = headers
      headers['DS-Interceptor'] = 'abort'
      // headers.Content-Type
      if (status !== 204) {
        // （1）如果没有Content-Type，根据response的内容自动设置
        if (!headers['Content-Type']) {
          if (response.html != null) {
            headers['Content-Type'] = 'text/html'
          } else if (response.json != null) {
            headers['Content-Type'] = 'application/json'
          } else if (response.script != null) {
            headers['Content-Type'] = 'application/javascript'
          } else if (response.css != null) {
            headers['Content-Type'] = 'text/css'
          } else {
            headers['Content-Type'] = 'text/plain'
          }
        }
        // （2）如果Content-Type没有charset，自动设置为utf-8
        if (headers['Content-Type'] != null && !headers['Content-Type'].includes('charset')) {
          headers['Content-Type'] += '; charset=utf-8'
        }
      }
      // headers.Access-Control-Allow-*：避免跨域问题
      if (rOptions.headers.origin && !headers['Access-Control-Allow-Origin']) {
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Access-Control-Allow-Origin'] = rOptions.headers.origin
      }

      res.writeHead(status, headers)
      if (status !== 204) {
        res.write(body)
      }
      res.end()

      const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
      log.info('abort intercept:', url, ', response:', JSON.stringify(response))
      return true // true代表请求结束
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.abort
  },
}
