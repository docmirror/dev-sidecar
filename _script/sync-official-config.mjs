/**
 * 把「官方远程配置」同步进「内置配置（internal）」
 *
 * 背景
 *   内置配置 = core/src/config/index.js 里的 defaultConfig（metaInfo.id 为 'internal'）
 *   官方配置 = app.remoteConfig.url 指向的远程配置（metaInfo.id 为 'official'）
 *   官方配置是**部分覆盖层**（只有 server.intercepts/preSetIpList/whiteList/dns、proxy、plugin、help），
 *   不含 app 的本地设置与 server.setting 等键，所以只替换它提供的那些节点。
 *
 * 做法
 *   1. 从 core/src/config/index.js 读出官方配置地址
 *   2. 下载并校验官方配置
 *   3. 抽出规则类内容，序列化成 JS 字面量，写回 index.js 里 SYNC:OFFICIAL-FALLBACK 标记之间的区块
 *   4. 该区块在运行时用 Object.assign 把内容**整体替换**进 defaultConfig
 *      （不是深合并 —— 这样官方「删掉」的键也会跟着消失）
 *
 * 也就是说：index.js 里的这个区块就是「internal 底本」，由本脚本在构建时自动跟随 official 更新。
 *
 * 参数
 *   （无）        下载并写回；失败时保留现有内容并警告，退出码仍为 0
 *   --strict     下载或校验失败时退出码 1（可用于 CI 强校验）
 *   --check      不写文件，只检查本地是否已是最新；有差异时退出码 1
 *   --dry-run    打印将要写入的内容，不写文件
 *   --file <路径> 不联网，直接读本地文件当作官方配置（离线/自测用）
 *
 * 幂等性：同一份官方配置重复执行，产出字节级一致（不含时间戳）。
 *
 * 用法
 *   node _script/sync-official-config.mjs
 *   node _script/sync-official-config.mjs --check
 *   node _script/sync-official-config.mjs --file ./remote_config.json5
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSON5 from 'json5'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const INDEX_JS_CANDIDATES = [
  path.resolve(REPO_ROOT, 'packages/core/src/config/index.js'),
  path.resolve(REPO_ROOT, 'vendor/ds-core/core/src/config/index.js'),
]
/** 「internal 底本」区块：由本脚本生成，内容 = 官方配置的规则类节点 */
const BEGIN_MARK = '// >>> SYNC:OFFICIAL-FALLBACK:BEGIN'
const END_MARK = '// <<< SYNC:OFFICIAL-FALLBACK:END'

/** 从官方配置里同步过来的键 */
const SYNC_SERVER_KEYS = ['intercepts', 'preSetIpList', 'whiteList', 'dns']

const argv = process.argv.slice(2)
const fileArgIndex = argv.indexOf('--file')
const OPT = {
  strict: argv.includes('--strict'),
  check: argv.includes('--check'),
  dryRun: argv.includes('--dry-run'),
  file: fileArgIndex >= 0 ? argv[fileArgIndex + 1] : null,
}

const DOWNLOAD_TIMEOUT_MS = 20_000
const DOWNLOAD_RETRY = 3
const DOWNLOAD_RETRY_DELAY_MS = 2000

function log (msg) {
  console.log(`[sync-official-config] ${msg}`)
}

function fail (msg) {
  console.error(`[sync-official-config] ${msg}`)
}

function findIndexJs () {
  const found = INDEX_JS_CANDIDATES.find(p => fs.existsSync(p))
  if (!found) {
    fail(`找不到内置配置文件，已尝试:\n  ${INDEX_JS_CANDIDATES.join('\n  ')}`)
    process.exit(1)
  }
  return found
}

/** 从源码文本里取官方配置地址（优先 OFFICIAL_REMOTE_CONFIG_URL 常量，其次 app.remoteConfig.url 字面量） */
function pickRemoteConfigUrl (source) {
  const constant = source.match(/OFFICIAL_REMOTE_CONFIG_URL\s*=\s*['"]([^'"]+)['"]/)
  if (constant) {
    return constant[1]
  }
  const inline = source.match(/remoteConfig\s*:\s*\{[\s\S]*?\burl\s*:\s*['"]([^'"]+)['"]/)
  if (!inline) {
    throw new Error('在 index.js 里找不到 OFFICIAL_REMOTE_CONFIG_URL 或 app.remoteConfig.url')
  }
  return inline[1]
}

async function fetchOnce (url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: { 'User-Agent': 'dev-sidecar-sync-official-config' },
  })
  if (!res.ok) {
    // gitee raw 偶发限流（429/451）或 5xx，交给上层重试
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  if (!text || text.trim().length < 2) {
    throw new Error('响应内容为空')
  }
  return text
}

async function download (url) {
  let lastError
  for (let attempt = 1; attempt <= DOWNLOAD_RETRY; attempt++) {
    try {
      return await fetchOnce(url)
    } catch (e) {
      lastError = e
      if (attempt < DOWNLOAD_RETRY) {
        log(`第 ${attempt} 次拉取失败（${e.message}），${DOWNLOAD_RETRY_DELAY_MS}ms 后重试`)
        await new Promise(resolve => setTimeout(resolve, DOWNLOAD_RETRY_DELAY_MS * attempt))
      }
    }
  }
  throw lastError
}

/** 校验并抽出需要同步的内容 */
function extractContent (text, url) {
  const config = JSON5.parse(text)

  if (config == null || typeof config !== 'object') {
    throw new Error('解析结果不是对象')
  }
  const metaInfo = config.app && config.app.metaInfo
  if (metaInfo == null || typeof metaInfo !== 'object') {
    throw new Error('缺少 app.metaInfo，可能不是官方配置')
  }
  if (typeof metaInfo.version !== 'number') {
    throw new Error('app.metaInfo.version 不是数字')
  }

  const server = {}
  for (const key of SYNC_SERVER_KEYS) {
    if (config.server && config.server[key] !== undefined) {
      server[key] = config.server[key]
    }
  }

  return {
    url,
    version: metaInfo.version,
    updateLog: metaInfo.updateLog || '',
    content: {
      app: {
        metaInfo: {
          version: metaInfo.version,
          updateLog: metaInfo.updateLog || '',
        },
      },
      server,
      proxy: config.proxy || {},
      plugin: config.plugin || {},
      help: config.help || {},
    },
  }
}

/** 合法的 JS 标识符（可作无引号键名） */
function isValidIdent (key) {
  return /^[A-Za-z_$][\w$]*$/.test(key)
}

function quoteString (value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    // 转义 ${ 以避免 no-template-curly-in-string（\$ 与原值等价）
    .replace(/\$\{/g, '\\${')}'`
}

/** 序列化为 JS 字面量：2 空格缩进、单引号、多行尾随逗号 */
function serialize (value, depth) {
  const pad = '  '.repeat(depth)
  const padInner = '  '.repeat(depth + 1)

  if (value === null) {
    return 'null'
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'string') {
    return quoteString(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const items = value.map(item => padInner + serialize(item, depth + 1))
    return `[\n${items.join(',\n')},\n${pad}]`
  }
  const keys = Object.keys(value)
  if (keys.length === 0) {
    return '{}'
  }
  // style/quote-props: consistent-as-needed —— 只要有一个键需要引号，本对象内全部加引号
  const needQuote = keys.some(key => !isValidIdent(key))
  const items = keys.map((key) => {
    const name = needQuote ? quoteString(key) : key
    return `${padInner}${name}: ${serialize(value[key], depth + 1)}`
  })
  return `{\n${items.join(',\n')},\n${pad}}`
}

/** 生成「internal 底本」区块：把官方内容内联 + Object.assign 进 defaultConfig */
function buildBlock ({ url, version, updateLog, content }) {
  const appMeta = (content.app && content.app.metaInfo) || {}
  const server = content.server || {}
  return [
    BEGIN_MARK,
    '// 「internal 底本」：官方配置的规则类节点，由 _script/sync-official-config.mjs 在构建时自动更新，请勿手改。',
    `// 来源地址：${url}`,
    `// 来源版本：${version}${updateLog ? `（${updateLog}）` : ''}`,
    '// 下载失败时脚本不会改动本区块，即保留上一次的同步结果。',
    '// 用 Object.assign 整体替换（不是深合并），这样官方「删掉」的键也会跟着消失。',
    '/* eslint-disable no-template-curly-in-string -- 官方配置里存在 ${...} 形式的普通字符串（如代理目标），并非模板串 */',
    'Object.assign(defaultConfig, {',
    `  proxy: ${serialize(content.proxy ?? {}, 1)},`,
    `  plugin: ${serialize(content.plugin ?? {}, 1)},`,
    `  help: ${serialize(content.help ?? {}, 1)},`,
    '})',
    'Object.assign(defaultConfig.server, {',
    ...SYNC_SERVER_KEYS.map(key => `  ${key}: ${serialize(server[key] ?? {}, 1)},`),
    '})',
    'Object.assign(defaultConfig.app.metaInfo, {',
    `  version: ${appMeta.version},`,
    `  updateLog: ${quoteString(appMeta.updateLog || '')},`,
    '})',
    '/* eslint-enable no-template-curly-in-string */',
    END_MARK,
  ].join('\n')
}

function replaceBlock (source, block) {
  const begin = source.indexOf(BEGIN_MARK)
  const end = source.indexOf(END_MARK)
  if (begin < 0 || end < 0 || end < begin) {
    throw new Error(`index.js 里找不到 ${BEGIN_MARK} / ${END_MARK} 标记`)
  }
  return source.slice(0, begin) + block + source.slice(end + END_MARK.length)
}

async function main () {
  const indexJs = findIndexJs()
  const source = fs.readFileSync(indexJs, 'utf-8')
  const url = pickRemoteConfigUrl(source)

  log(`内置配置: ${path.relative(REPO_ROOT, indexJs)}`)
  log(OPT.file ? `官方配置: ${url}（改用本地文件 ${OPT.file}）` : `官方配置: ${url}`)

  let parsed
  try {
    const text = OPT.file
      ? fs.readFileSync(path.resolve(process.cwd(), OPT.file), 'utf-8')
      : await download(url)
    parsed = extractContent(text, url)
  } catch (e) {
    // 拉取/校验失败：不改动文件，保留上一次的同步结果
    fail(`同步失败，保留现有内容: ${e.message}`)
    if (OPT.strict) {
      process.exit(1)
    }
    return
  }

  const next = replaceBlock(source, buildBlock(parsed))

  if (next === source) {
    log(`已是最新（版本 ${parsed.version}），无需改动`)
    return
  }

  if (OPT.check) {
    fail(`本地内置配置不是最新的官方配置（官方版本 ${parsed.version}），请执行: node _script/sync-official-config.mjs`)
    process.exit(1)
  }

  if (OPT.dryRun) {
    log(`--dry-run：以下内容将被写入（版本 ${parsed.version}）`)
    console.log(next)
    return
  }

  fs.writeFileSync(indexJs, next, 'utf-8')
  log(`已同步为官方配置版本 ${parsed.version}${parsed.updateLog ? `（${parsed.updateLog}）` : ''}`)
}

main().catch((e) => {
  fail(`未预期的错误: ${e.stack || e.message}`)
  if (OPT.strict) {
    process.exit(1)
  }
  process.exit(0)
})
