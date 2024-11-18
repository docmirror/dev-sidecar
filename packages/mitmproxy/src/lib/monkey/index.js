const fs = require('node:fs')
const path = require('node:path')
const log = require('../../utils/util.log')

let scripts

function buildScript (sc, content, scriptName) {
  const scriptKey = `ds_${scriptName}${sc.version ? (`_${sc.version}`) : ''}:`

  // 代码1：监听事件
  const runAt = sc['run-at'] || 'document-end'
  let eventStr
  if (runAt === 'document-end') {
    eventStr = 'document.addEventListener("DOMContentLoaded"'
  } else {
    eventStr = 'window.addEventListener("load"'
  }

  // 代码2：初始化
  const options = {
    name: sc.name,
    version: sc.version,
    icon: sc.icon,
  }
  const initStr = `
const DS_init = (window.__ds_global__ || {})['DS_init']
if (typeof DS_init === 'function') {
\tconsole.log("${scriptKey} do DS_init")
\tDS_init(${JSON.stringify(options)});
} else {
\tconsole.log("${scriptKey} has no DS_init")
}`

  // 代码3：判断是否启用了脚本
  const checkEnabledStr = `
if (!((window.__ds_global__ || {}).GM_getValue || (() => true))("ds_enabled", true)) {
\tconsole.log("${scriptKey} tampermonkey disabled")
\treturn
}`

  // 代码4：`GM_xxx` 方法读取
  let grantStr = ''
  for (const item of sc.grant) {
    if (grantStr.length > 0) {
      grantStr += '\r\n'
    }

    if (item.indexOf('.') > 0) {
      grantStr += `${item} = (window.__ds_global__ || {})['${item}'];`
    } else {
      grantStr += `const ${item} = (window.__ds_global__ || {})['${item}'] || (() => {});`
    }
  }

  // 拼接脚本
  return `${eventStr}, () => {${
    initStr}\r\n${
    checkEnabledStr}\r\n\r\n${
    grantStr ? (`${grantStr}\r\n\r\n`) : ''
  }${content
  }\r\nconsole.log("${scriptKey} completed")`
  + `\r\n})`
  + `\r\nconsole.log("${scriptKey} loaded")`
}

function loadScript (content, scriptName) {
  // @grant        GM_registerMenuCommand
  // @grant        GM_unregisterMenuCommand
  // @grant        GM_openInTab
  // @grant        GM_getValue
  // @grant        GM_setValue
  // @grant        GM_notification
  const annoFlag = '// ==/UserScript=='
  const arr = content.split(annoFlag)
  const start = 0

  const confStr = arr[start]
  const confItemArr = confStr.split('\n')
  const sc = {
    grant: [],
    match: [],
    script: '',
  }
  for (const string of confItemArr) {
    const reg = new RegExp('.*@(\\S+)\\s(.+)')
    const ret = string.match(reg)
    if (ret) {
      const key = ret[1].trim()
      const value = ret[2].trim()
      if (key === 'grant') {
        sc.grant.push(value)
      } else if (key === 'match') {
        sc.match.push(value)
      } else {
        sc[key] = value
      }
    }
  }
  const script = arr[start + 1].trim()

  sc.script = buildScript(sc, script, scriptName)
  return sc
}

function readFile (rootDir, script) {
  log.info('read script, script root location:', path.resolve('./'))
  const location = path.join(rootDir, `./${script}`)
  log.info('read script, the script location:', location)
  return fs.readFileSync(location).toString()
}

const api = {
  get (rootDir) {
    if (scripts == null) {
      return api.load(rootDir)
    }
    return scripts
  },
  load (rootDir) {
    scripts = {}
    scripts.github = loadScript(readFile(rootDir, 'github.script'), 'github')
    scripts.google = loadScript(readFile(rootDir, 'google.js'), 'google')
    // scripts.jquery = { script: readFile(rootDir, 'jquery.min.js') }
    scripts.tampermonkey = { script: readFile(rootDir, 'tampermonkey.script') }
    return scripts
  },
  loadScript,
}

module.exports = api
