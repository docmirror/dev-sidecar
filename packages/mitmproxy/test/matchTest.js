const name = '/docmirror/dev-sidecar/raw/master/doc/index.png'
// https://raw.fastgit.org/docmirror/dev-sidecar/master/doc/index.png
const ret = name.replace(/^(.+)\/raw\/(.+)$/, 'raw.fastgit.org$1/$2')
console.log(ret)

const reg = new RegExp('^/[^/]+/[^/]+$')
console.log('/greper/d2-crud-plus/blob/master/.eslintignore'.match(reg))

const chunk = Buffer.from('<head></head>')
const script = '<script>a</script>'
const index = chunk.indexOf('</head>')
const scriptBuf = Buffer.from(script)
const chunkNew = Buffer.alloc(chunk.length + scriptBuf.length)
chunk.copy(chunkNew, 0, 0, index)
scriptBuf.copy(chunkNew, index, 0)
chunk.copy(chunkNew, index + scriptBuf.length, index)
console.log(chunkNew.toString())

const reg2 = '/aaaa/i'
console.log(new RegExp(reg2).test('aaaa'))
