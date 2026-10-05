#!/usr/bin/env node
/**
 * 本地打包 CLI（SEA）：把 packages/cli/package.json 的版本号注入为 `<base>-dev.<工作区指纹>`，
 * 构建完成后无论如何都还原（说明见 _script/local-build-version.mjs 与 doc/git-sha256-migration.md）。
 *
 * scripts/build.js 在启动时读取 package.json 的 version 并烘进 SEA blob（产物名也带该版本号），
 * 所以注入必须发生在这个子进程启动之前 —— 本脚本正是这么做的。
 * 默认只打包本机平台；需要全平台请直接 `node scripts/build.js --all`。
 *
 * 用法：
 *   node scripts/local-build-version.mjs --print   只看会生成什么版本号
 *   node scripts/local-build-version.mjs           注入 -> SEA 打包 -> 还原
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeVersion, fingerprint, runSteps, withLocalVersion } from '../../../_script/local-build-version.mjs'

const CLI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export { computeVersion, fingerprint }

process.exit(await withLocalVersion({
  pkgPath: path.join(CLI_DIR, 'package.json'),
  run: () => runSteps([['node', ['scripts/build.js']]], CLI_DIR),
}))