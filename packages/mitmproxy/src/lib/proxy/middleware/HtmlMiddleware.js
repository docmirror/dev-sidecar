const through = require('through2')
const zlib = require('zlib')
// eslint-disable-next-line no-unused-vars
const url = require('url')

const httpUtil = {}
httpUtil.isGzip = function (res) {
  const contentEncoding = res.headers['content-encoding']
  return !!(contentEncoding && contentEncoding.toLowerCase() === 'gzip')
}
httpUtil.isHtml = function (res) {
  const contentType = res.headers['content-type']
  return (typeof contentType !== 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType)
}

// eslint-disable-next-line no-unused-vars
function injectContentIntoHtmlHead (html, content) {
  html = html.replace(/(<\/head>)/i, function (match) {
    return content + match
  })
  return html
}
function injectScriptIntoHtmlHead (html, content) {
  return html
}
function injectContentIntoHtmlBody (html, content) {
  html = html.replace(/(<\/body>)/i, function (match) {
    return content + match
  })
  return html
}

function chunkReplace (_this, chunk, enc, callback, headContent, bodyContent) {
  let chunkString = chunk.toString()
  if (headContent) {
    chunkString = injectScriptIntoHtmlHead(chunkString, headContent)
  }
  if (bodyContent) {
    chunkString = injectContentIntoHtmlBody(chunkString, bodyContent)
  }
  _this.push(Buffer.alloc(chunkString))
  callback()
}

module.exports = class InjectHtmlPlugin {
  constructor ({
    head,
    body
  }) {
    this.head = head
    this.body = body
  }

  responseInterceptor (req, res, proxyReq, proxyRes, ssl, next) {
    if (!this.head && !this.body) {
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
          let newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
            return match.toUpperCase()
          })
          newkey = key
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
            chunkReplace(this, chunk, enc, callback, this.head, this.body)
          })).pipe(new zlib.Gzip()).pipe(res)
      } else {
        proxyRes.pipe(through(function (chunk, enc, callback) {
          chunkReplace(this, chunk, enc, callback, this.head, this.body)
        })).pipe(res)
      }
    }
    next()
  }
}
