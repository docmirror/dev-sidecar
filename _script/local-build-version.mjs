/**
 * 本地打包版本号支持：`<base>-dev.<工作区指纹>`
 *
 * 设计取舍（只做「身份」，不做「新旧」）：
 * - 版本号只携带内容指纹 => 「同一份代码 => 同一个版本号」，与是否已提交无关
 *   （同一改动提交前后工作区内容相同 -> 树相同 -> 指纹相同）。
 * - 刻意不含构建时间：构建时间只说明「哪个包后打」，不代表「代码更新」；
 *   要看代码先后请用 git（`git merge-base --is-ancestor <a> <b>`，分叉时不可比）。
 * - 前缀用 `dev`（semver 预发布段按字典序比较）：alpha < beta < dev < rc < 正式版。
 *   于是本地包比任何 CI beta 都「新」（不会追着提示升级 beta），但低于正式版（会正确提示升级）。
 *
 * 指纹实现：用临时 index 把工作区（含未跟踪文件、遵守 .gitignore）写成一棵树
 * （与 `git stash` 内部同款做法），再连同**各子模块**的同类结果做一次 sha256 取 7 位。
 * 自己再哈希一层的两个原因：一是把子模块改动也算进来（dev-sidecar 的核心在 vendor/ds-core，
 * 只指纹超级项目会漏掉它）；二是与 git 的哈希格式无关 —— SHA-1 仓库与 SHA-256 仓库输出
 * 同样的 7 位十六进制，所以 Git 3.0 的 SHA-256 迁移不影响版本号格式
 * （迁移注意事项见 doc/git-sha256-migration.md）。
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** 指纹取多少位十六进制：定宽，避免互为前缀的两个版本号在字符串比较下失去意义 */
export const FP_LEN = 7

function git (cwd, args, extraEnv) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  }).trim()
}

/** 仓库根目录 */
export function repoRoot (cwd) {
  try {
    return git(cwd, ['rev-parse', '--show-toplevel'])
  } catch (e) {
    throw new Error(`本地打包需要 git 仓库（计算工作区指纹用）：${e.message}`)
  }
}

/** 用临时 index 把 cwd 的工作区写成一棵树，返回 tree OID（不触碰真实 index） */
function workTreeId (cwd) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-fp-'))
  const env = { GIT_INDEX_FILE: path.join(tmpDir, 'index') } // 文件不存在 -> git 视为空 index
  try {
    git(cwd, ['add', '-A'], env)
    return git(cwd, ['write-tree'], env)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/** 子模块路径（相对仓库根）；dev-sidecar 的核心 vendor/ds-core 在这里，必须计入指纹 */
function submodulePaths (root) {
  try {
    return git(root, ['submodule', 'status', '--recursive'])
      .split('\n')
      .map((line) => line.trim().replace(/^[-+U]?[0-9a-f]+\s+/, '').split(' ')[0])
      .filter((p) => p && fs.existsSync(path.join(root, p)))
  } catch {
    return []
  }
}

/** 工作区指纹：主仓库 + 各子模块的树，各取 OID 后一起 sha256 */
export function fingerprint (root) {
  const parts = [`. :${workTreeId(root)}`]
  for (const sub of submodulePaths(root)) {
    try {
      parts.push(`${sub}:${workTreeId(path.join(root, sub))}`)
    } catch {
      parts.push(`${sub}:unavailable`)
    }
  }
  return createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, FP_LEN)
}

/** 由包的 package.json 算出本地版本号 */
export function computeVersion (pkgPath) {
  const base = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
  return `${base}-dev.${fingerprint(repoRoot(path.dirname(pkgPath)))}`
}

/** 依次执行命令，任一失败即抛出 */
export function runSteps (steps, cwd) {
  for (const [cmd, args] of steps) {
    const ret = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true })
    if (ret.status !== 0) {
      throw new Error(`命令失败（退出码 ${ret.status}）：${cmd} ${args.join(' ')}`)
    }
  }
}

/**
 * 注入本地版本号 -> 执行 run() -> 无论如何都还原 package.json。
 *
 * 本地与 CI 的关键差别：CI 的 checkout 是一次性的，改脏无所谓；本地不还原会把 `-dev` 版本号
 * 留在工作区，甚至被误提交、污染后续正式版构建。
 *
 * @returns {Promise<number>} 进程退出码
 */
export async function withLocalVersion ({ pkgPath, run }) {
  const originalPkg = fs.readFileSync(pkgPath, 'utf8')
  const version = computeVersion(pkgPath)
  const label = path.relative(process.cwd(), pkgPath)

  if (process.argv.includes('--print')) {
    console.log(version)
    return 0
  }

  const pkg = JSON.parse(originalPkg)
  pkg.version = version
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n') // 与 CI 的写法保持一致
  console.log(`[local-build] ${label} 版本号：${version}`)

  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    fs.writeFileSync(pkgPath, originalPkg)
    console.log(`[local-build] 已还原 ${label}`)
  }
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      restore()
      process.exit(1)
    })
  }

  let status = 1
  try {
    await run()
    status = 0
  } catch (e) {
    console.error(`[local-build] 构建失败：${e.message}`)
  } finally {
    restore()
  }
  return status
}