import { strictEqual } from 'node:assert'
import { load } from '../src/lib/monkey'

let scripts
try {
  scripts = load('../gui/extra/scripts/') // 相对于 mitmproxy 目录的相对路径，而不是当前 test 目录的。
} catch {
  scripts = load('../../gui/extra/scripts/') // 相对于 当前 test 目录的相对路径
}

// console.log(scripts)
strictEqual(scripts.github != null, true)
strictEqual(scripts.google != null, true)
strictEqual(scripts.tampermonkey != null, true)
