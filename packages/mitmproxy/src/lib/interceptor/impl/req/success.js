module.exports = {
  name: 'success',
  priority: 102,
  requestIntercept (context, interceptOpt, req, res, ssl, next) {
    const { rOptions, log } = context

    if (interceptOpt.success === true || interceptOpt.success === 'true') {
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'DS-Interceptor': 'success',
      }

      // headers.Access-Control-Allow-*：避免跨域问题
      if (rOptions.headers.origin) {
        headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Access-Control-Allow-Origin'] = rOptions.headers.origin
      }

      res.writeHead(200, headers)
      res.write(
        'DevSidecar 200: Request success.\n\n'
        + '  This request is matched by success intercept.\n\n'
        + '  因配置success拦截器，本请求直接返回200成功。',
      )
      res.end()

      const url = `${rOptions.method} ➜ ${rOptions.protocol}//${rOptions.hostname}:${rOptions.port}${req.url}`
      log.info('success intercept:', url)
      return true // true代表请求结束
    } else {
      const response = interceptOpt.success

      // status
      const status = response.status || 200
      response.status = status

      // body
      const body = response.html || response.json || response.script || response.css || response.text || response.body
        || `DevSidecar ${status}: Request success.\n\n`
        + '  This request is matched by success intercept.\n\n'
        + `  因配置success拦截器，本请求直接返回${status}成功。`

      // headers
      const headers = response.headers || {}
      response.headers = headers
      headers['DS-Interceptor'] = 'success'
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
      log.info('success intercept:', url, ', response:', JSON.stringify(response))
      return true // true代表请求结束
    }
  },
  is (interceptOpt) {
    return !!interceptOpt.success
  },
}
