/**
 * 生成内核身份信息（提交 SHA），供关于信息 / 界面底栏展示。
 *
 * 输出：src/generated/kernel-info.js
 *
 * 为什么构建期生成：GUI 由 electron-builder 打包，asar 内没有 .git，
 * 运行时无法执行 git rev-parse；因此在打包前把 SHA 烘焙进产物。
 *
 * 内核 package.json 的 version 已废弃（见 ds-core 的 AGENTS.md），任何地方都不展示；
 * 身份只用提交 SHA：短 SHA 面向用户，长 SHA 供排障对照。
 *
 * 与本目录 gen-tray-plugins.mjs 同属「prebuild 生成物」约定：生成结果需提交进仓库，
 * 否则未执行 prebuild 的场景（如直接 serve）会因缺少该文件而构建失败。
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GUI_DIR = path.resolve(__dirname, '..')
// packages/core 是指向 vendor/ds-core/core 的软链
const KERNEL_DIR = path.resolve(GUI_DIR, '../core')
const OUT = path.join(GUI_DIR, 'src/generated/kernel-info.js')

function kernelGit (args) {
  return execFileSync('git', args, { cwd: KERNEL_DIR, encoding: 'utf8' }).trim()
}

let short = ''
let full = ''
try {
  short = kernelGit(['rev-parse', '--short', 'HEAD'])
  full = kernelGit(['rev-parse', 'HEAD'])
} catch (e) {
  console.warn('[gen-kernel-info] 读取内核提交失败，写入空值:', e.message)
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, [
  '// 由 scripts/gen-kernel-info.mjs 生成，请勿手改。',
  '// 内核身份 = 提交 SHA；内核 package.json 的 version 已废弃，不对外展示。',
  `export const KERNEL_SHA_SHORT = ${JSON.stringify(short)}`,
  `export const KERNEL_SHA_FULL = ${JSON.stringify(full)}`,
  '',
].join('\n'))
console.log(`[gen-kernel-info] 内核 ${short || '(未知)'} -> ${path.relative(GUI_DIR, OUT)}`)
