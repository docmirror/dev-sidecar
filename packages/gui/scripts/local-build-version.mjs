#!/usr/bin/env node
/**
 * 本地打包 GUI：把 packages/gui/package.json 的版本号注入为 `<base>-dev.<工作区指纹>`，
 * 构建完成后无论如何都还原（说明见 _script/local-build-version.mjs 与 doc/git-sha256-migration.md）。
 *
 * 用法：
 *   node scripts/local-build-version.mjs --print   只看会生成什么版本号
 *   node scripts/local-build-version.mjs           注入 -> 构建 -> 还原
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeVersion, fingerprint, runSteps, withLocalVersion } from '../../../_script/local-build-version.mjs'

const GUI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export { computeVersion, fingerprint }

process.exit(await withLocalVersion({
  pkgPath: path.join(GUI_DIR, 'package.json'),
  run: () => runSteps([
    // 统一走 pnpm：npm 会把 npm_config_user_agent 带进子进程，
    // 让 electron-builder 误判包管理器（日志里的 resolvedPackageManager=npm）
    ['pnpm', ['run', 'build']],
    ['pnpm', ['exec', 'electron-builder', '--config', 'electron-builder.config.cjs']],
  ], GUI_DIR),
}))
