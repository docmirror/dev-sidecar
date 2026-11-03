/**
 * 打包前按目标架构裁剪原生平台包。
 *
 * koffi 与 @starknt 的原生包把同一平台的每个架构各装一份
 * （例如 @koromix/koffi-win32-x64 / -ia32 / -arm64），pnpm 会把它们都装进 node_modules，
 * electron-builder 再原样打进每个架构的安装包。结果是 x64 安装包里带着 arm64 和 ia32 的 .node。
 *
 * electron-builder 的 files 排除规则不支持 ${arch} 宏，而 beforePack 在 copyAppFiles
 * 之前执行，所以在这里按当前打包架构把不匹配的包追加进 platformSpecificBuildOptions.files。
 *
 * 只在能判断出平台和架构时才排除：名字里没有平台/架构标记的主包（如 @starknt/sysproxy）保持原样。
 */
const fs = require('node:fs')
const path = require('node:path')

// context.arch 是 electron-builder 的数字枚举，自带映射即可，不必 require('builder-util')
// （它不是本仓库的依赖，pnpm 严格布局下解析不到，会让钩子加载直接失败）
const ARCH_NAMES = ['ia32', 'x64', 'armv7l', 'arm64', 'universal']

const SCOPES = ['@koromix', '@starknt']
const PLATFORMS = ['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'android']
// 顺序重要：arm64 要在 arm 之前匹配，riscv64 要在 x64 之前匹配
const ARCHS = ['arm64', 'riscv64', 'loong64', 'ppc64', 'armv7l', 'ia32', 'x64', 'arm']

/** 向上收集所有 node_modules/.pnpm：pnpm workspace 里子包目录可能有个空的 .pnpm，不能只看第一层 */
function findPnpmDirs (startDir) {
  const dirs = []
  let dir = path.resolve(startDir)
  for (;;) {
    const candidate = path.join(dir, 'node_modules', '.pnpm')
    if (fs.existsSync(candidate)) {
      dirs.push(candidate)
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return dirs
    }
    dir = parent
  }
}

function installedPackages (projectDir, scope) {
  const names = new Set()
  // hoisted 布局（CI 用 `pnpm install --node-linker hoisted`）：node_modules/@scope 下是实体目录
  let dir = path.resolve(projectDir)
  for (;;) {
    const scopeDir = path.join(dir, 'node_modules', scope)
    if (fs.existsSync(scopeDir)) {
      for (const entry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          names.add(`${scope}/${entry.name}`)
        }
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }
  // 隔离布局（本地默认）：目录名形如 @koromix+koffi-win32-x64@3.3.3
  for (const pnpmDir of findPnpmDirs(projectDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      const m = entry.match(/^(@[^+]+)\+(.+?)@/)
      if (m && m[1] === scope) {
        names.add(`${m[1]}/${m[2]}`)
      }
    }
  }
  return names
}

function platformOf (name) {
  return PLATFORMS.find(p => name.includes(`-${p}-`) || name.endsWith(`-${p}`)) || null
}

function archOf (name) {
  return ARCHS.find(a => name.includes(`-${a}-`) || name.endsWith(`-${a}`)) || null
}

/** 解析出「包家族 + 平台 + 架构」，解析不出来（主包）返回 null */
function parsePlatformPackage (name) {
  const platform = platformOf(name)
  const arch = archOf(name)
  if (platform == null || arch == null) {
    return null
  }
  const idx = name.lastIndexOf(`-${platform}-`)
  if (idx < 0) {
    return null
  }
  return { base: name.slice(0, idx), platform, arch }
}

/** 计算当前目标平台/架构下要排除的包（导出以便单测） */
function computeExcludes ({ projectDir, platform, arch }) {
  if (arch === 'universal') {
    // macOS universal 同时包含 x64 与 arm64，不能裁
    return []
  }

  // 按「包家族」分组（如 @koromix/koffi、@starknt/sysproxy）：只有在目标平台+架构的变体
  // 确实存在时才裁剪，否则（例如 @starknt/sysproxy 只有 win32-x64）保留现有变体，
  // 避免把该平台唯一的原生绑定裁掉。
  const groups = new Map()
  for (const scope of SCOPES) {
    for (const name of installedPackages(projectDir, scope)) {
      const parsed = parsePlatformPackage(name)
      if (parsed == null) {
        continue
      }
      const list = groups.get(parsed.base) || []
      list.push({ name, ...parsed })
      groups.set(parsed.base, list)
    }
  }

  const excludes = []
  for (const parsedList of groups.values()) {
    const target = parsedList.find(it => it.platform === platform && it.arch === arch)
    if (target == null) {
      continue
    }
    for (const it of parsedList) {
      if (it.platform === platform && it.arch === arch) {
        continue
      }
      excludes.push(`!node_modules/${it.name}{,/**/*}`)
    }
  }
  return excludes
}

exports.computeExcludes = computeExcludes

exports.default = async function beforePack (context) {
  const arch = ARCH_NAMES[context.arch] || 'x64'
  const platform = context.electronPlatformName
  const projectDir = context.packager.projectDir

  const excludes = computeExcludes({ projectDir, platform, arch })
  if (excludes.length === 0) {
    console.log(`[beforePack] ${platform}/${arch}: 没有需要裁剪的原生包`)
    return
  }

  const options = context.packager.platformSpecificBuildOptions
  options.files = [...(Array.isArray(options.files) ? options.files : []), ...excludes]

  console.log(`[beforePack] ${platform}/${arch}: 排除 ${excludes.length} 个非目标平台/架构的原生包`)
  for (const pattern of excludes) {
    console.log(`  ${pattern}`)
  }
}
