const assert = require('node:assert')
const monkey = require('../src/lib/monkey')

let scripts
try {
  scripts = monkey.load('../gui/extra/scripts/') // 相对于 mitmproxy 目录的相对路径，而不是当前 test 目录的。
} catch {
  scripts = monkey.load('../../gui/extra/scripts/') // 相对于 当前 test 目录的相对路径
}

// console.log(scripts)
assert.strictEqual(scripts.github != null, true)
assert.strictEqual(scripts.google != null, true)
assert.strictEqual(scripts.tampermonkey != null, true)
