const log = require('../../../utils/util.log')
const through = require('through2')
const zlib = require('zlib')

// 编解码器
const codecMap = {
  gzip: {
    createCompressor: () => zlib.createGzip(),
    createDecompressor: () => zlib.createGunzip()
  },
  deflate: {
    createCompressor: () => zlib.createDeflate(),
    createDecompressor: () => zlib.createInflate()
  },
  br: {
    createCompressor: () => zlib.createBrotliCompress(),
    createDecompressor: () => zlib.createBrotliDecompress()
  }
}
const supportedEncodings = Object.keys(codecMap)
const supportedEncodingsStr = supportedEncodings.join(', ')

const httpUtil = {
  // 获取响应内容编码
  getContentEncoding (res) {
    const encoding = res.headers['content-encoding']
    if (encoding) {
      return encoding.toLowerCase()
    }
    return null
  },
  // 获取编解码器
  getCodec (encoding) {
    return codecMap[encoding]
  },
  // 获取支持的编解码器名称字符串
  supportedEncodingsStr () {
    return supportedEncodingsStr
  },
  // 是否HTML代码
  isHtml (res) {
    const contentType = res.headers['content-type']
    return (typeof contentType !== 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType)
  }
}
const HEAD = Buffer.from('</head>')
const HEAD_UP = Buffer.from('</HEAD>')
const BODY = Buffer.from('</body>')
const BODY_UP = Buffer.from('</BODY>')

function chunkByteReplace (_this, chunk, enc, callback, append) {
  if (append) {
    if (append.head) {
      const ret = injectScriptIntoHtml([HEAD, HEAD_UP], chunk, append.head)
      if (ret != null) {
        chunk = ret
      }
    }
    if (append.body) {
      const ret = injectScriptIntoHtml([BODY, BODY_UP], chunk, append.body)
      if (ret != null) {
        chunk = ret
      }
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

function handleResponseHeaders (res, proxyRes) {
  Object.keys(proxyRes.headers).forEach(function (key) {
    if (proxyRes.headers[key] !== undefined) {
      // let newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
      //   return match.toUpperCase()
      // })
      const newkey = key
      if (key === 'content-length') {
        // do nothing
        return
      }
      if (key === 'content-security-policy') {
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
    // log.info(`urlPath: ${urlPath}, fileName: ${filename}, script: ${script}`)

    log.info('ds_script, filename:', filename, ', `script != null` =', script != null)
    const now = new Date()
    res.writeHead(200, {
      'DS-Middleware': 'ds_script',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86401, immutable', // 缓存1天
      'Last-Modified': now.toUTCString(),
      Expires: new Date(now.getTime() + 86400000).toUTCString(), // 缓存1天
      Date: new Date().toUTCString()
    })
    res.write(script.script)
    res.end()
    return true
  },
  responseInterceptor (req, res, proxyReq, proxyRes, ssl, next, append) {
    if (append == null || (!append.head && !append.body)) {
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
    }

    // 先处理头信息
    handleResponseHeaders(res, proxyRes)

    // 获取响应内容编码
    const encoding = httpUtil.getContentEncoding(proxyRes)
    if (encoding) {
      // 获取编解码器
      const codec = httpUtil.getCodec(encoding)
      if (codec) {
        proxyRes
          .pipe(codec.createDecompressor()) // 解码
          .pipe(through(function (chunk, enc, callback) {
            // 插入head和body
            chunkByteReplace(this, chunk, enc, callback, append)
          }))
          .pipe(codec.createCompressor()) // 编码
          .pipe(res)
      } else {
        log.error(`InsertScriptMiddleware.responseInterceptor(): 暂不支持编码方式 ${encoding}, 目前支持:`, httpUtil.supportedEncodingsStr())
      }
    } else {
      proxyRes
        .pipe(through(function (chunk, enc, callback) {
          chunkByteReplace(this, chunk, enc, callback, append)
        }))
        .pipe(res)
    }

    next()
  },
  httpUtil,
  handleResponseHeaders
}
