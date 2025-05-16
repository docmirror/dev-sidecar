const assert = require('node:assert')

const name = '/docmirror/dev-sidecar/raw/master/doc/figures/open-after-installed.png'
// https://raw.fastgit.org/docmirror/dev-sidecar/master/doc/figures/open-after-installed.png
const ret = name.replace(/^(.+)\/raw\/(.+)$/, 'raw.fastgit.org$1/$2')
console.log(ret)
assert.strictEqual(ret, 'raw.fastgit.org/docmirror/dev-sidecar/master/doc/figures/open-after-installed.png')

const reg = /^\/[^/]+\/[^/]+$/
console.log('/greper/d2-crud-plus/blob/master/.eslintignore'.match(reg))
assert.strictEqual('/greper/d2-crud-plus/blob/master/.eslintignore'.match(reg), null)

const chunk = Buffer.from('<head></head>')
const script = '<script>a</script>'
const index = chunk.indexOf('</head>')
const scriptBuf = Buffer.from(script)
const chunkNew = Buffer.alloc(chunk.length + scriptBuf.length)
chunk.copy(chunkNew, 0, 0, index)
scriptBuf.copy(chunkNew, index, 0)
chunk.copy(chunkNew, index + scriptBuf.length, index)
console.log(chunkNew.toString())
assert.strictEqual(chunkNew.toString(), '<head><script>a</script></head>')

const reg2 = /aaaa/i
console.log(reg2.test('aaaa')) // true
assert.strictEqual(reg2.test('aaaa'), true)

const reg3 = '/aaaa/i'
console.log(new RegExp(reg3).test('aaaa')) // false
assert.strictEqual(new RegExp(reg3).test('aaaa'), false)
