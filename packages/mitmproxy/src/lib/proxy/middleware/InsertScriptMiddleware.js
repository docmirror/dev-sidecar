const zlib = require('node:zlib')
const through = require('through2')
const log = require('../../../utils/util.log.server')

const HTML_CONTENT_TYPE_RE = /text\/html|application\/xhtml\+xml/
const CSP_SCRIPT_SRC_RE = /script-src(-elem)?\s+([^;]*)/gi

// 编解码器
const codecMap = {
  gzip: {
    createCompressor: () => zlib.createGzip(),
    createDecompressor: () => zlib.createGunzip(),
  },
  deflate: {
    createCompressor: () => zlib.createDeflate(),
    createDecompressor: () => zlib.createInflate(),
  },
  br: {
    createCompressor: () => zlib.createBrotliCompress(),
    createDecompressor: () => zlib.createBrotliDecompress(),
  },
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
    return (typeof contentType !== 'undefined') && HTML_CONTENT_TYPE_RE.test(contentType)
  },
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
  // HTTP/2 禁止头，上游服务器可能返回，直传会导致 http2 模块抛异常
  const HTTP2_FORBIDDEN = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'http2-settings'])
  Object.keys(proxyRes.headers).forEach((key) => {
    if (proxyRes.headers[key] !== undefined) {
      const newkey = key
      if (key === 'content-length') {
        // 因为下方会重新编码响应体，故丢弃 content-length
        return
      }
      if (HTTP2_FORBIDDEN.has(key)) {
        return
      }
      if (key === 'content-security-policy') {
        // content-security-policy
        let policy = proxyRes.headers[key]

        // 检查是否已有 script-src 指令
        const hasScriptSrc = /script-src(-elem)?\s+/i.test(policy)

        // 如果已有 script-src，确保包含 'self'
        policy = policy.replace(CSP_SCRIPT_SRC_RE, (match, elem, value) => {
          const directive = `script-src${elem || ''}`
          const trimmedValue = value.trim()
          if (trimmedValue.includes("'self'")) {
            return match
          }
          return `${directive} 'self' ${trimmedValue}`
        })

        // 如果原本没有 script-src，显式添加（否则 fallback 到 default-src 'none' 会屏蔽同源脚本）
        if (!hasScriptSrc) {
          policy = `script-src 'self'; ${policy}`
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
    let filename = urlPath.replace(contextPath, '')

    // 重命名过，向下兼容
    if (filename === 'global') {
      filename = 'tampermonkey'
    }

    const script = monkey.get(setting.script.defaultDir)[filename]
    // log.info(`urlPath: ${urlPath}, fileName: ${filename}, script: ${script}`)

    log.info('ds_script, filename:', filename, ', `script != null` =', script != null)
    if (script == null) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`DevSidecar: script '${filename}' not found`)
      return true
    }
    const now = new Date()
    res.writeHead(200, {
      'DS-Middleware': 'ds_script',
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86401, immutable', // 缓存1天
      'Last-Modified': now.toUTCString(),
      'Expires': new Date(now.getTime() + 86400000).toUTCString(), // 缓存1天
      'Date': now.toUTCString(),
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
      return proxyRes.headers['content-length'] === '0'
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
  handleResponseHeaders,
}
