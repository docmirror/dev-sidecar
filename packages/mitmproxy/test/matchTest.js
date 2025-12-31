import { strictEqual } from 'node:assert'

const name = '/docmirror/dev-sidecar/raw/master/doc/index.png'
// https://raw.fastgit.org/docmirror/dev-sidecar/master/doc/index.png
const ret = name.replace(/^(.+)\/raw\/(.+)$/, 'raw.fastgit.org$1/$2')
console.log(ret)
strictEqual(ret, 'raw.fastgit.org/docmirror/dev-sidecar/master/doc/index.png')

const reg = /^\/[^/]+\/[^/]+$/
console.log('/greper/d2-crud-plus/blob/master/.eslintignore'.match(reg))
strictEqual('/greper/d2-crud-plus/blob/master/.eslintignore'.match(reg), null)

const chunk = Buffer.from('<head></head>')
const script = '<script>a</script>'
const index = chunk.indexOf('</head>')
const scriptBuf = Buffer.from(script)
const chunkNew = Buffer.alloc(chunk.length + scriptBuf.length)
chunk.copy(chunkNew, 0, 0, index)
scriptBuf.copy(chunkNew, index, 0)
chunk.copy(chunkNew, index + scriptBuf.length, index)
console.log(chunkNew.toString())
strictEqual(chunkNew.toString(), '<head><script>a</script></head>')

const reg2 = /aaaa/i
console.log(reg2.test('aaaa')) // true
strictEqual(reg2.test('aaaa'), true)

const reg3 = '/aaaa/i'
console.log(new RegExp(reg3).test('aaaa')) // false
strictEqual(new RegExp(reg3).test('aaaa'), false)
