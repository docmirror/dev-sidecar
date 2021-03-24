const through = require('through2')
const zlib = require('zlib')
// eslint-disable-next-line no-unused-vars
const url = require('url')

var httpUtil = {}
httpUtil.getCharset = function (res) {
  const contentType = res.getHeader('content-type')
  const reg = /charset=(.*)/
  const matched = contentType.match(reg)
  if (matched) {
    return matched[1]
  }
  return 'utf-8'
}
httpUtil.isGzip = function (res) {
  var contentEncoding = res.headers['content-encoding']
  return !!(contentEncoding && contentEncoding.toLowerCase() === 'gzip')
}
httpUtil.isHtml = function (res) {
  var contentType = res.headers['content-type']
  return (typeof contentType !== 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType)
}
const HEAD = Buffer.from('</head>')
const HEAD_UP = Buffer.from('</HEAD>')
const BODY = Buffer.from('</body>')
const BODY_UP = Buffer.from('</BODY>')

function chunkByteReplace (_this, chunk, enc, callback, append) {
  if (append && append.head) {
    const ret = injectScriptIntoHtml([HEAD, HEAD_UP], chunk, append.head)
    if (ret != null) {
      chunk = ret
    }
  }
  if (append && append.body) {
    const ret = injectScriptIntoHtml([BODY, BODY_UP], chunk, append.body)
    if (ret != null) {
      chunk = ret
    }
  }
  _this.push(chunk)
  callback()
}
function injectScriptIntoHtml (tags, chunk, script) {
  for (const tag of tags) {
    const index = chunk.indexOf(tag)
    if (index < 0) {
      continue
    }
    const scriptBuf = Buffer.from(script)
    const chunkNew = Buffer.alloc(chunk.length + scriptBuf.length)
    chunk.copy(chunkNew, 0, 0, index)
    scriptBuf.copy(chunkNew, index, 0)
    chunk.copy(chunkNew, index + scriptBuf.length, index)
    return chunkNew
  }
  return null
}

const contextPath = '/____ds_script____/'
const monkey = require('../../monkey')
module.exports = {

  requestIntercept (context, req, res, ssl, next) {
    const { rOptions, log, setting } = context
    if (rOptions.path.indexOf(contextPath) !== 0) {
      return
    }
    const urlPath = rOptions.path
    const filename = urlPath.replace(contextPath, '')

    const script = monkey.get(setting.script.defaultDir)[filename]

    log.info('ds_script', filename, script != null)
    res.writeHead(200)
    res.write(script.script)
    res.end()
    return true
  },
  responseInterceptor (req, res, proxyReq, proxyRes, ssl, next, append) {
    if (!append.head && !append.body) {
      next()
      return
    }

    const isHtml = httpUtil.isHtml(proxyRes)
    const contentLengthIsZero = (() => {
      return proxyRes.headers['content-length'] === 0
    })()
    if (!isHtml || contentLengthIsZero) {
      next()
      return
    } else {
      Object.keys(proxyRes.headers).forEach(function (key) {
        if (proxyRes.headers[key] !== undefined) {
          // let newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
          //   return match.toUpperCase()
          // })
          const newkey = key
          if (isHtml && key === 'content-length') {
            // do nothing
            return
          }
          if (isHtml && key === 'content-security-policy') {
            // content-security-policy
            let policy = proxyRes.headers[key]
            const reg = /script-src ([^:]*);/i
            const matched = policy.match(reg)
            if (matched) {
              if (matched[1].indexOf('self') < 0) {
                policy = policy.replace('script-src', 'script-src \'self\' ')
              }
            }
            res.setHeader(newkey, policy)
            return
          }

          res.setHeader(newkey, proxyRes.headers[key])
        }
      })

      res.writeHead(proxyRes.statusCode)

      const isGzip = httpUtil.isGzip(proxyRes)

      if (isGzip) {
        proxyRes.pipe(new zlib.Gunzip())
          .pipe(through(function (chunk, enc, callback) {
            chunkByteReplace(this, chunk, enc, callback, append)
          })).pipe(new zlib.Gzip()).pipe(res)
      } else {
        proxyRes.pipe(through(function (chunk, enc, callback) {
          chunkByteReplace(this, chunk, enc, callback, append)
        })).pipe(res)
      }
    }
    next()
  }
}
