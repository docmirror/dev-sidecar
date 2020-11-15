const through = require('through2')
const zlib = require('zlib')
// eslint-disable-next-line no-unused-vars
const url = require('url')

var httpUtil = {}
httpUtil.isGzip = function (res) {
  var contentEncoding = res.headers['content-encoding']
  return !!(contentEncoding && contentEncoding.toLowerCase() === 'gzip')
}
httpUtil.isHtml = function (res) {
  var contentType = res.headers['content-type']
  return (typeof contentType !== 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType)
}

function injectScriptIntoHeadHtml (html, script) {
  html = html.replace(/(<\/head>)/i, function (match) {
    return script + match
  })
  return html
}

function injectScriptIntoBodyHtml (html, script) {
  html = html.replace(/(<\/body>)/i, function (match) {
    return script + match
  })
  return html
}

function chunkReplace (_this, chunk, enc, callback, append) {
  let chunkString = chunk.toString()
  if (append && append.head) {
    chunkString = injectScriptIntoHeadHtml(chunkString, append.head)
  }
  if (append && append.body) {
    chunkString = injectScriptIntoBodyHtml(chunkString, append.body)
  }
  // eslint-disable-next-line node/no-deprecated-api
  _this.push(new Buffer(chunkString))
  callback()
}

module.exports = {
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
    } else {
      Object.keys(proxyRes.headers).forEach(function (key) {
        if (proxyRes.headers[key] !== undefined) {
          // let newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
          //   return match.toUpperCase()
          // })
          const newkey = key
          if (isHtml && key === 'content-length') {
            // do nothing
          } else {
            res.setHeader(newkey, proxyRes.headers[key])
          }
        }
      })

      res.writeHead(proxyRes.statusCode)

      const isGzip = httpUtil.isGzip(proxyRes)

      if (isGzip) {
        proxyRes.pipe(new zlib.Gunzip())
          .pipe(through(function (chunk, enc, callback) {
            chunkReplace(this, chunk, enc, callback, append)
          })).pipe(new zlib.Gzip()).pipe(res)
      } else {
        proxyRes.pipe(through(function (chunk, enc, callback) {
          chunkReplace(this, chunk, enc, callback, append)
        })).pipe(res)
      }
    }
    next()
  }
}
